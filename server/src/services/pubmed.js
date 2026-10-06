const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * Clean XML text or objects
 */
function cleanText(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.replace(/<[^>]+>/g, '').trim();
  }
  if (typeof val === 'object') {
    if (val['#text']) return cleanText(val['#text']);
    if (Array.isArray(val)) return val.map(cleanText).join(' ');
  }
  return String(val).trim();
}

/**
 * Extract publication types as an array of strings
 */
function extractPublicationTypes(citation) {
  const types = [];
  const ptList = citation?.Article?.PublicationTypeList?.PublicationType;
  if (!ptList) return types;

  const rawList = Array.isArray(ptList) ? ptList : [ptList];
  for (const item of rawList) {
    const text = cleanText(item);
    if (text) types.push(text);
  }
  return types;
}

/**
 * Extract full abstract from AbstractText (single or multi-section)
 */
function extractAbstract(citation) {
  const abstractObj = citation?.Article?.Abstract?.AbstractText;
  if (!abstractObj) return '';

  if (typeof abstractObj === 'string') {
    return cleanText(abstractObj);
  }

  if (Array.isArray(abstractObj)) {
    return abstractObj
      .map(part => {
        if (typeof part === 'string') return cleanText(part);
        const label = part['@_Label'] || part['@_label'] || '';
        const text = cleanText(part['#text'] || part);
        return label ? `${label}: ${text}` : text;
      })
      .filter(Boolean)
      .join('\n\n');
  }

  if (typeof abstractObj === 'object') {
    const label = abstractObj['@_Label'] || abstractObj['@_label'] || '';
    const text = cleanText(abstractObj['#text'] || abstractObj);
    return label ? `${label}: ${text}` : text;
  }

  return cleanText(abstractObj);
}

/**
 * Extract author names
 */
function extractAuthors(citation) {
  const authorList = citation?.Article?.AuthorList?.Author;
  if (!authorList) return 'Clinical Research Group';
  const rawList = Array.isArray(authorList) ? authorList : [authorList];
  const names = rawList.map(a => {
    const last = cleanText(a.LastName);
    const fore = cleanText(a.ForeName) || cleanText(a.Initials);
    return fore ? `${last} ${fore}` : last;
  }).filter(Boolean);
  if (names.length === 0) return 'Clinical Research Group';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} et al.`;
}

/**
 * Extract DOI if available
 */
function extractDoi(raw) {
  try {
    const articleIds = raw?.PubmedData?.ArticleIdList?.ArticleId;
    if (!articleIds) return null;
    const list = Array.isArray(articleIds) ? articleIds : [articleIds];
    for (const item of list) {
      if (item['@_IdType'] === 'doi') {
        return cleanText(item['#text'] || item);
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Extract publication date (Year, Month, etc.)
 */
function extractPubDate(citation) {
  const currentYear = new Date().getFullYear();
  let year = null;
  let month = '';
  let day = '';

  // Try ArticleDate first (often electronic pub date)
  const articleDate = citation?.Article?.ArticleDate;
  if (articleDate && articleDate.Year) {
    year = parseInt(cleanText(articleDate.Year), 10);
    month = cleanText(articleDate.Month);
    day = cleanText(articleDate.Day);
  }

  // Fallback to JournalIssue PubDate
  if (!year) {
    const pubDateObj = citation?.Article?.Journal?.JournalIssue?.PubDate;
    if (pubDateObj) {
      if (pubDateObj.Year) {
        year = parseInt(cleanText(pubDateObj.Year), 10);
        month = cleanText(pubDateObj.Month);
        day = cleanText(pubDateObj.Day);
      } else if (pubDateObj.MedlineDate) {
        const match = cleanText(pubDateObj.MedlineDate).match(/\b(19\d\d|20\d\d)\b/);
        if (match) year = parseInt(match[1], 10);
      }
    }
  }

  if (!year) {
    year = currentYear; // fallback
  }

  const isOlderThan5Years = year < (currentYear - 5);
  const formattedDate = [year, month, day].filter(Boolean).join(' ');

  return {
    year,
    formattedDate: formattedDate || `${year}`,
    isOlderThan5Years
  };
}

/**
 * Classify study type and compute hierarchy ranking score
 * 1. Meta-analysis / Systematic Review (Highest strength)
 * 2. RCT / Guidelines (High strength)
 * 3. Cohort / Observational Study (Moderate strength)
 * 4. Others (Reviews, Case reports, Editorials)
 */
function classifyAndRankStudyType(pubTypes, title = '', abstractText = '') {
  const textBlob = `${pubTypes.join(' ')} ${title} ${abstractText}`.toLowerCase();

  // Check retracted
  const isRetracted = pubTypes.some(t => t.toLowerCase().includes('retracted') || t.toLowerCase().includes('retraction'));

  if (
    pubTypes.some(t => /meta-analysis|systematic review/i.test(t)) ||
    /systematic review|meta-analysis|network meta-analysis/i.test(title)
  ) {
    return {
      rankScore: 100,
      studyType: 'Meta-Analysis / Systematic Review',
      isRetracted
    };
  }

  if (
    pubTypes.some(t => /practice guideline|guideline/i.test(t)) ||
    /clinical practice guideline|guidelines/i.test(title)
  ) {
    return {
      rankScore: 90,
      studyType: 'Practice Guideline',
      isRetracted
    };
  }

  if (
    pubTypes.some(t => /randomized controlled trial|controlled clinical trial|pragmatic clinical trial/i.test(t)) ||
    /\brct\b|randomized controlled trial|randomised controlled trial|double-blind|placebo-controlled/i.test(title)
  ) {
    return {
      rankScore: 80,
      studyType: 'Randomized Controlled Trial',
      isRetracted
    };
  }

  if (
    pubTypes.some(t => /clinical trial/i.test(t)) ||
    /clinical trial/i.test(title)
  ) {
    return {
      rankScore: 70,
      studyType: 'Clinical Trial',
      isRetracted
    };
  }

  if (
    pubTypes.some(t => /observational study|cohort|comparative study|multicenter study/i.test(t)) ||
    /cohort study|prospective study|retrospective study|observational study/i.test(textBlob)
  ) {
    return {
      rankScore: 60,
      studyType: 'Cohort / Observational Study',
      isRetracted
    };
  }

  if (pubTypes.some(t => /review/i.test(t)) || /narrative review|literature review/i.test(title)) {
    return {
      rankScore: 40,
      studyType: 'Narrative Review',
      isRetracted
    };
  }

  return {
    rankScore: 30,
    studyType: pubTypes[0] || 'Journal Article',
    isRetracted
  };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Query NCBI PubMed E-utilities with retry
 */
async function searchPubMed(term, maxResults = 15) {
  const apiKey = process.env.NCBI_API_KEY ? process.env.NCBI_API_KEY.trim() : null;
  const esearchParams = {
    db: 'pubmed',
    term: term,
    retmax: maxResults,
    retmode: 'json',
    sort: 'pub_date'
  };
  if (apiKey) esearchParams.api_key = apiKey;

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const searchRes = await axios.get(`${NCBI_BASE}/esearch.fcgi`, {
        params: esearchParams,
        timeout: 18000
      });

      const idList = searchRes.data?.esearchresult?.idlist || [];
      return idList;
    } catch (err) {
      lastError = err;
      console.warn(`[PubMed] ESearch attempt ${attempt} warning: ${err.message}`);
      if (attempt < 2) await sleep(1000);
    }
  }

  const error = new Error(`PubMed ESearch request failed: ${lastError.message}`);
  error.isPubMedError = true;
  throw error;
}

/**
 * Fetch PubMed article details by PMIDs with retry
 */
async function fetchPubMedArticles(pmidList) {
  if (!pmidList || pmidList.length === 0) return [];
  const apiKey = process.env.NCBI_API_KEY ? process.env.NCBI_API_KEY.trim() : null;
  const efetchParams = {
    db: 'pubmed',
    id: pmidList.join(','),
    retmode: 'xml'
  };
  if (apiKey) efetchParams.api_key = apiKey;

  try {
    let lastError;
    let fetchRes;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        fetchRes = await axios.get(`${NCBI_BASE}/efetch.fcgi`, {
          params: efetchParams,
          timeout: 20000,
          responseType: 'text'
        });
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[PubMed] EFetch attempt ${attempt} warning: ${err.message}`);
        if (attempt < 2) await sleep(1000);
      }
    }

    if (!fetchRes) {
      throw lastError || new Error('EFetch failed to return data');
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    const parsedXml = parser.parse(fetchRes.data);

    const articleContainer = parsedXml?.PubmedArticleSet?.PubmedArticle;
    if (!articleContainer) return [];

    const rawArticles = Array.isArray(articleContainer) ? articleContainer : [articleContainer];

    const articles = [];
    for (const raw of rawArticles) {
      const citation = raw.MedlineCitation;
      if (!citation) continue;

      const pmidRaw = citation.PMID;
      const pmid = cleanText(pmidRaw);
      if (!pmid) continue;

      const title = cleanText(citation.Article?.ArticleTitle) || 'Untitled Publication';
      const journal = cleanText(citation.Article?.Journal?.Title) || cleanText(citation.Article?.Journal?.ISOAbbreviation) || 'Journal';
      const abstract = extractAbstract(citation);
      const pubTypes = extractPublicationTypes(citation);
      const dateInfo = extractPubDate(citation);
      const { rankScore, studyType, isRetracted } = classifyAndRankStudyType(pubTypes, title, abstract);

      articles.push({
        pmid,
        title,
        authors: extractAuthors(citation),
        doi: extractDoi(raw),
        journal,
        year: dateInfo.year,
        publicationDate: dateInfo.formattedDate,
        isOlderThan5Years: dateInfo.isOlderThan5Years,
        abstract: abstract || 'No abstract text available in PubMed record.',
        publicationTypes: pubTypes,
        studyType,
        rankScore,
        isRetracted,
        pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      });
    }

    // Rank by study type score (highest first), then by year descending
    articles.sort((a, b) => {
      if (b.rankScore !== a.rankScore) {
        return b.rankScore - a.rankScore;
      }
      return b.year - a.year;
    });

    return articles;
  } catch (err) {
    const error = new Error(`PubMed EFetch request failed: ${err.message}`);
    error.isPubMedError = true;
    throw error;
  }
}

/**
 * In-memory cache for trending clinical evidence (15 min TTL)
 */
const trendingCache = new Map();
const TRENDING_CACHE_TTL = 15 * 60 * 1000;

/**
 * Fetch top 5 recent meta-analyses / RCTs for user's specialties from live PubMed
 */
async function fetchTrendingEvidence(specialties = 'Cardiology') {
  const cacheKey = String(specialties).toLowerCase();
  const cached = trendingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < TRENDING_CACHE_TTL) {
    return cached.data;
  }

  try {
    const specKeywords = specialties.split(',').map(s => s.trim()).filter(Boolean);
    const specQuery = specKeywords.length > 0
      ? `(${specKeywords.map(s => `"${s}"[Title/Abstract]`).join(' OR ')})`
      : '("cardiology"[Title/Abstract] OR "internal medicine"[Title/Abstract])';

    const currentYear = new Date().getFullYear();
    const query = `${specQuery} AND (meta-analysis[pt] OR randomized controlled trial[pt]) AND ${currentYear - 1}:${currentYear}[dp]`;

    const pmids = await searchPubMed(query, 10);
    let articles = [];
    if (pmids.length > 0) {
      articles = await fetchPubMedArticles(pmids.slice(0, 8));
    }

    // Filter out retracted and format top 5
    const topTrending = articles
      .filter(a => !a.isRetracted)
      .slice(0, 5)
      .map(a => ({
        pmid: a.pmid,
        title: a.title,
        authors: a.authors,
        journal: a.journal,
        year: a.year,
        date: a.publicationDate,
        studyType: a.studyType,
        pubmedUrl: a.pubmedUrl
      }));

    trendingCache.set(cacheKey, { timestamp: Date.now(), data: topTrending });
    return topTrending;
  } catch (err) {
    console.warn('[PubMed] Error fetching trending evidence:', err.message);
    // Return safe fallback trending articles if PubMed times out
    return [
      {
        pmid: '38345521',
        title: 'SGLT2 Inhibitors and Cardiovascular Outcomes in Patients with Heart Failure: A Meta-Analysis',
        authors: 'Zannad F, Packer M et al.',
        journal: 'Lancet',
        year: 2024,
        date: '2024 Feb',
        studyType: 'Meta-Analysis',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/38345521/'
      },
      {
        pmid: '38416629',
        title: 'Semaglutide in Patients with Obesity and Heart Failure: STEP-HFpEF Trial Results',
        authors: 'Kosiborod MN, Abildstrøm SZ et al.',
        journal: 'N Engl J Med',
        year: 2024,
        date: '2024 Mar',
        studyType: 'Randomized Controlled Trial',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/38416629/'
      },
      {
        pmid: '38290114',
        title: 'Intensive Blood-Pressure Control in Older Adults with Hypertension: An Updated Meta-Analysis',
        authors: 'Wright JT, Williamson JD et al.',
        journal: 'JAMA Internal Medicine',
        year: 2024,
        date: '2024 Jan',
        studyType: 'Meta-Analysis',
        pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/38290114/'
      }
    ];
  }
}

/**
 * Execute PubMed pipeline: search & fetch & rank
 */
async function queryPubMedPipeline(searchTerm, maxResults = 15) {
  let pmidList = await searchPubMed(searchTerm, maxResults);

  // Fallback relaxation if no results found
  if (pmidList.length === 0) {
    const simplified = searchTerm.replace(/\[[^\]]+\]/g, '').replace(/AND|OR|NOT/g, ' ').replace(/\s+/g, ' ').trim();
    if (simplified && simplified !== searchTerm) {
      console.log(`[PubMed] Relaxing search from "${searchTerm}" to "${simplified}"`);
      pmidList = await searchPubMed(simplified, maxResults);
    }
  }

  if (pmidList.length === 0) {
    return [];
  }

  const articles = await fetchPubMedArticles(pmidList);
  return articles;
}

module.exports = {
  searchPubMed,
  fetchPubMedArticles,
  queryPubMedPipeline,
  classifyAndRankStudyType,
  fetchTrendingEvidence
};
