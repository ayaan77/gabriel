/* global chrome */
// CRO RAG Module - True RAG with Vector Embeddings
// Implements semantic similarity search for pattern retrieval

// Try to import transformers, fallback to simple matching if unavailable
let pipeline = null;
let embeddingModel = null;

// Initialize embedding model (lazy loading)
async function initEmbeddingModel() {
  if (embeddingModel) return embeddingModel;

  try {
    // Dynamic import to avoid bundling issues
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;

    // Use lightweight model suitable for browser
    // all-MiniLM-L6-v2 is ~30MB, good balance of speed and quality
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Use quantized model for smaller size
      revision: 'main'
    });

    console.log('✅ Embedding model loaded');
    return embeddingModel;
  } catch (e) {
    console.warn('⚠️ Could not load embedding model, falling back to keyword matching:', e.message);
    return null;
  }
}

/**
 * Generate embedding for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
export async function embedText(text) {
  const model = await initEmbeddingModel();

  if (!model) {
    // Fallback: return simple hash-based "embedding" for keyword matching
    return fallbackEmbedding(text);
  }

  try {
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (e) {
    console.warn('Embedding failed:', e);
    return fallbackEmbedding(text);
  }
}

/**
 * Fallback embedding using keyword hashing (when transformers unavailable)
 * @param {string} text - Text to embed
 * @returns {number[]} Simple hash-based vector
 */
function fallbackEmbedding(text) {
  const keywords = text.toLowerCase().split(/\s+/);
  const vector = new Array(100).fill(0);

  // eslint-disable-next-line no-unused-vars
  keywords.forEach((word, _idx) => {
    const hash = hashCode(word);
    vector[Math.abs(hash) % 100] += 1;
  });

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Similarity score (0-1)
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    console.warn('Vector length mismatch:', a.length, 'vs', b.length);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build vector index from patterns
 * @param {Array} patterns - Array of pattern objects
 * @returns {Promise<Array>} Indexed patterns with embeddings
 */
export async function buildPatternIndex(patterns) {
  console.log('🔨 Building pattern index...');
  const startTime = performance.now();

  const indexedPatterns = [];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];

    // Create rich text representation for embedding
    const textToEmbed = `${pattern.name}. ${pattern.pattern}. ${pattern.semanticDescription || ''} ${pattern.antiPattern || ''}`;

    try {
      const embedding = await embedText(textToEmbed);
      indexedPatterns.push({
        ...pattern,
        embedding,
        embeddingText: textToEmbed
      });

      if ((i + 1) % 10 === 0) {
        console.log(`  Indexed ${i + 1}/${patterns.length} patterns...`);
      }
    } catch (e) {
      console.warn(`Failed to index pattern ${pattern.id}:`, e);
      // Still add pattern without embedding
      indexedPatterns.push({
        ...pattern,
        embedding: null,
        embeddingText: textToEmbed
      });
    }
  }

  const endTime = performance.now();
  console.log(`✅ Pattern index built in ${(endTime - startTime).toFixed(0)}ms`);

  return indexedPatterns;
}

/**
 * Search for relevant patterns using RAG
 * @param {string} queryText - Page content/query
 * @param {Array} patternIndex - Indexed patterns
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} Top K relevant patterns
 */
export async function searchRelevantPatterns(queryText, patternIndex, topK = 20) {
  console.log('🔍 Searching for relevant patterns...');
  const startTime = performance.now();

  // Embed query
  const queryEmbedding = await embedText(queryText);

  // Calculate similarity with all patterns
  const results = patternIndex
    .filter(p => p.embedding !== null) // Skip patterns without embeddings
    .map(pattern => ({
      ...pattern,
      similarity: cosineSimilarity(queryEmbedding, pattern.embedding)
    }));

  // Sort by similarity and return top K
  results.sort((a, b) => b.similarity - a.similarity);

  const topResults = results.slice(0, topK);

  const endTime = performance.now();
  console.log(`✅ Found ${topResults.length} relevant patterns in ${(endTime - startTime).toFixed(0)}ms`);
  console.log('Top matches:', topResults.slice(0, 3).map(r => `${r.name} (${(r.similarity * 100).toFixed(1)}%)`).join(', '));

  return topResults;
}

/**
 * Hybrid search: RAG + Page Type Filtering
 * @param {Object} pageData - Page data object
 * @param {Array} patternIndex - Indexed patterns
 * @param {number} topK - Number of results
 * @param {Function} detectPageType - Page type detection function
 * @returns {Promise<Array>} Filtered and ranked patterns
 */
export async function hybridPatternSearch(pageData, patternIndex, topK = 20, detectPageType) {
  // Build query from page content
  const queryParts = [
    pageData.title || '',
    (pageData.headings || []).map(h => h.text).join('. '),
    pageData.visibleText?.substring(0, 1000) || ''
  ];

  const queryText = queryParts.join('. ');

  // Get page type for filtering
  const pageType = detectPageType ? detectPageType(pageData) : 'general';

  // Search with RAG
  let relevantPatterns = await searchRelevantPatterns(queryText, patternIndex, topK * 2);

  // Filter by page type applicability
  relevantPatterns = relevantPatterns.filter(pattern => {
    if (!pattern.applicableTo || pattern.applicableTo.includes('all')) return true;
    return pattern.applicableTo.includes(pageType);
  });

  // Return top K after filtering
  return relevantPatterns.slice(0, topK);
}

/**
 * Cache pattern index in IndexedDB
 * @param {Array} index - Pattern index to cache
 * @param {string} version - Cache version
 */
export async function cachePatternIndex(index, version = '1.0') {
  try {
    const cacheKey = `cro_pattern_index_v${version}`;
    const data = {
      timestamp: Date.now(),
      version,
      index
    };

    // Store in chrome.storage.local if available
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [cacheKey]: data });
      console.log('✅ Pattern index cached');
    }
  } catch (e) {
    console.warn('Failed to cache pattern index:', e);
  }
}

/**
 * Load cached pattern index
 * @param {string} version - Cache version
 * @returns {Promise<Array|null>} Cached index or null
 */
export async function loadCachedPatternIndex(version = '1.0') {
  try {
    const cacheKey = `cro_pattern_index_v${version}`;

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get(cacheKey);
      if (result[cacheKey]) {
        console.log('✅ Pattern index loaded from cache');
        return result[cacheKey].index;
      }
    }

    return null;
  } catch (e) {
    console.warn('Failed to load cached pattern index:', e);
    return null;
  }
}

/**
 * Main RAG analysis function
 * @param {Object} pageData - Page data
 * @param {Array} patterns - Raw patterns to index
 * @param {Object} options - Options
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeWithRAG(pageData, patterns, options = {}) {
  const {
    topK = 20,
    detectPageType = null,
    useCache = true,
    cacheVersion = '1.0'
  } = options;

  console.log('🧠 Starting RAG analysis...');
  const startTime = performance.now();

  // Try to load cached index
  let patternIndex = useCache ? await loadCachedPatternIndex(cacheVersion) : null;

  // Build index if not cached
  if (!patternIndex) {
    patternIndex = await buildPatternIndex(patterns);

    // Cache for future use
    if (useCache) {
      await cachePatternIndex(patternIndex, cacheVersion);
    }
  }

  // Perform hybrid search
  const relevantPatterns = await hybridPatternSearch(
    pageData,
    patternIndex,
    topK,
    detectPageType
  );

  const endTime = performance.now();
  console.log(`✅ RAG analysis complete in ${(endTime - startTime).toFixed(0)}ms`);

  return {
    relevantPatterns,
    totalPatterns: patterns.length,
    retrievedCount: relevantPatterns.length,
    usingEmbeddings: embeddingModel !== null,
    pageType: detectPageType ? detectPageType(pageData) : 'general'
  };
}

export default {
  embedText,
  cosineSimilarity,
  buildPatternIndex,
  searchRelevantPatterns,
  hybridPatternSearch,
  analyzeWithRAG,
  cachePatternIndex,
  loadCachedPatternIndex
};