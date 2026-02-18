/**
 * LLM Council Module
 * 
 * 3-stage deliberation: parallel first opinions → anonymized peer review → chairman synthesis
 * Inspired by karpathy/llm-council
 */

import Groq from 'groq-sdk';
import { COUNCIL_CONFIG } from '../config';

// ===== HELPERS =====

function getClient(apiKey) {
    return new Groq({ apiKey, dangerouslyAllowBrowser: true });
}

/** Small delay to avoid hitting Groq rate limits between stages */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Query a single model. Returns null on failure (graceful degradation).
 */
async function queryModel(client, model, messages, temperature = 0.7, maxTokens = 2000) {
    try {
        const completion = await client.chat.completions.create({
            messages,
            model,
            temperature,
            max_tokens: maxTokens
        });
        return {
            model,
            content: completion.choices[0]?.message?.content || ''
        };
    } catch (err) {
        console.warn(`⚠️ Council: Model ${model} failed:`, err.message);
        return null; // graceful degradation
    }
}

/**
 * Query multiple models in parallel. Filters out failures.
 */
async function queryModelsParallel(client, models, messages, temperature = 0.7, maxTokens = 2000) {
    const results = await Promise.allSettled(
        models.map(model => queryModel(client, model, messages, temperature, maxTokens))
    );

    return results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);
}

// ===== RANKING PARSING =====

/**
 * Parse "FINAL RANKING:" section from model response.
 * Primary: strict numbered list. Fallback: any "Response X" patterns.
 */
function parseRanking(text) {
    if (!text) return [];

    if (text.includes('FINAL RANKING:')) {
        const parts = text.split('FINAL RANKING:');
        if (parts.length >= 2) {
            const rankingSection = parts[1];

            // Primary: numbered list "1. Response A"
            const numbered = rankingSection.match(/\d+\.\s*Response [A-Z]/g);
            if (numbered) {
                return numbered.map(m => m.match(/Response [A-Z]/)[0]);
            }

            // Fallback: any "Response X" in order
            const fallback = rankingSection.match(/Response [A-Z]/g);
            if (fallback) return fallback;
        }
    }

    // Last resort: find any Response labels in the full text
    const lastResort = text.match(/Response [A-Z]/g);
    return lastResort || [];
}

/**
 * Calculate aggregate rankings across all peer evaluations.
 * Returns sorted list: [{model, avgRank, voteCount}]
 */
function calculateAggregateRankings(stage2Results, labelToModel) {
    const positions = {};

    for (const result of stage2Results) {
        const parsed = result.parsedRanking || [];
        parsed.forEach((label, idx) => {
            const model = labelToModel[label];
            if (model) {
                if (!positions[model]) positions[model] = [];
                positions[model].push(idx + 1);
            }
        });
    }

    return Object.entries(positions)
        .map(([model, ranks]) => ({
            model,
            avgRank: Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 100) / 100,
            voteCount: ranks.length
        }))
        .sort((a, b) => a.avgRank - b.avgRank);
}

// ===== 3-STAGE PIPELINE =====

/**
 * Stage 1: Collect individual responses from all council models.
 */
async function stage1CollectResponses(client, query, systemPrompt, models, onProgress) {
    onProgress?.('🏛️ **Stage 1/3: Collecting Opinions**\n\nQuerying council members in parallel...');

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
    ];

    const results = await queryModelsParallel(client, models, messages);

    if (results.length === 0) {
        throw new Error('All council models failed to respond. Please try again.');
    }

    onProgress?.(`🏛️ **Stage 1/3: Complete**\n\n✅ Received ${results.length}/${models.length} opinions`);
    return results;
}

/**
 * Stage 2: Anonymized peer review. Each model ranks the others.
 */
async function stage2CollectRankings(client, query, stage1Results, models, onProgress) {
    onProgress?.('⚖️ **Stage 2/3: Peer Review**\n\nModels are anonymously ranking each other...');

    // Anonymize: Response A, Response B, etc.
    const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i));
    const labelToModel = {};
    labels.forEach((label, i) => {
        labelToModel[`Response ${label}`] = stage1Results[i].model;
    });

    // Build anonymized responses text
    const responsesText = stage1Results.map((r, i) =>
        `Response ${labels[i]}:\n${r.content}`
    ).join('\n\n---\n\n');

    const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${query}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

    const rankingMessages = [{ role: 'user', content: rankingPrompt }];

    const rankingResults = await queryModelsParallel(client, models, rankingMessages, 0.3, 2000);

    const stage2Results = rankingResults.map(r => ({
        model: r.model,
        evaluation: r.content,
        parsedRanking: parseRanking(r.content)
    }));

    const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);

    onProgress?.(`⚖️ **Stage 2/3: Complete**\n\n✅ ${rankingResults.length} peer reviews collected`);

    return { stage2Results, labelToModel, aggregateRankings };
}

/**
 * Stage 3: Chairman synthesizes final answer from all opinions + rankings.
 */
async function stage3Synthesize(client, query, stage1Results, stage2Results, aggregateRankings, chairmanModel, onProgress) {
    onProgress?.('👑 **Stage 3/3: Chairman Synthesizing**\n\nThe chairman is compiling the final answer...');

    const stage1Text = stage1Results.map(r =>
        `Model: ${r.model}\nResponse:\n${r.content}`
    ).join('\n\n---\n\n');

    const rankingsSummary = aggregateRankings.map((r, i) =>
        `${i + 1}. ${r.model} (avg rank: ${r.avgRank}, votes: ${r.voteCount})`
    ).join('\n');

    const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have answered a question and then ranked each other's responses anonymously.

Original Question: ${query}

INDIVIDUAL RESPONSES:
${stage1Text}

AGGREGATE PEER RANKINGS (best to worst):
${rankingsSummary}

Your task as Chairman:
- Synthesize all responses into a single, comprehensive, accurate answer
- Weight higher-ranked responses more heavily
- Include the best insights from each response
- Resolve any disagreements between models
- Produce a clear, well-structured final answer

Provide your synthesized answer now:`;

    const messages = [{ role: 'user', content: chairmanPrompt }];

    const result = await queryModel(client, chairmanModel, messages, 0.5, 4000);

    if (!result) {
        return {
            model: chairmanModel,
            content: '❌ Chairman model failed. Please see individual opinions above.'
        };
    }

    onProgress?.('👑 **Stage 3/3: Complete**\n\n✅ Final synthesis ready');
    return result;
}

// ===== MAIN ORCHESTRATOR =====

/**
 * Run the full 3-stage council process.
 * 
 * @param {string} query - User's question/prompt
 * @param {string} systemPrompt - System prompt for the mode (architect, cro, etc.)
 * @param {string} apiKey - Groq API key
 * @param {function} onProgress - Callback for stage-by-stage progress updates
 * @returns {Object} { stage1, stage2, stage3, metadata }
 */
export async function runCouncil(query, systemPrompt, apiKey, onProgress) {
    const config = COUNCIL_CONFIG;
    const client = getClient(apiKey);

    // Stage 1: First opinions
    const stage1 = await stage1CollectResponses(
        client, query, systemPrompt, config.models, onProgress
    );

    // Delay between stages to avoid rate limiting
    await delay(config.stageDelay);

    // Stage 2: Anonymized peer review
    const { stage2Results, labelToModel, aggregateRankings } = await stage2CollectRankings(
        client, query, stage1, config.models, onProgress
    );

    // Delay before chairman
    await delay(config.stageDelay);

    // Stage 3: Chairman synthesis
    const stage3 = await stage3Synthesize(
        client, query, stage1, stage2Results, aggregateRankings, config.chairman, onProgress
    );

    return {
        stage1,
        stage2: stage2Results,
        stage3,
        metadata: {
            labelToModel,
            aggregateRankings,
            councilSize: config.models.length,
            chairman: config.chairman
        }
    };
}

/**
 * Check if council mode is available for a given mode.
 */
export function isCouncilAvailable(mode) {
    return COUNCIL_CONFIG.enabledModes.includes(mode);
}

export { parseRanking, calculateAggregateRankings };
