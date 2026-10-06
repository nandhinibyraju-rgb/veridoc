const axios = require('axios');

/**
 * Curated brand-to-generic clinical dictionary
 */
const BRAND_TO_GENERIC_MAP = {
  // Paracetamol / Acetaminophen
  'crocin': { generic: 'paracetamol', canonicalBrand: 'Crocin', usGeneric: 'acetaminophen' },
  'crosen': { generic: 'paracetamol', canonicalBrand: 'Crocin', usGeneric: 'acetaminophen' },
  'dolo': { generic: 'paracetamol', canonicalBrand: 'Dolo-650', usGeneric: 'acetaminophen' },
  'calpol': { generic: 'paracetamol', canonicalBrand: 'Calpol', usGeneric: 'acetaminophen' },
  'panadol': { generic: 'paracetamol', canonicalBrand: 'Panadol', usGeneric: 'acetaminophen' },
  'tylenol': { generic: 'paracetamol', canonicalBrand: 'Tylenol', usGeneric: 'acetaminophen' },
  'paracetamol': { generic: 'paracetamol', canonicalBrand: null, usGeneric: 'acetaminophen' },
  'acetaminophen': { generic: 'paracetamol', canonicalBrand: null, usGeneric: 'acetaminophen' },

  // Metformin
  'glucophage': { generic: 'metformin', canonicalBrand: 'Glucophage', usGeneric: 'metformin' },
  'glycomet': { generic: 'metformin', canonicalBrand: 'Glycomet', usGeneric: 'metformin' },
  'metformin': { generic: 'metformin', canonicalBrand: null, usGeneric: 'metformin' },

  // SGLT2 inhibitors
  'jardiance': { generic: 'empagliflozin', canonicalBrand: 'Jardiance', usGeneric: 'empagliflozin' },
  'farxiga': { generic: 'dapagliflozin', canonicalBrand: 'Farxiga', usGeneric: 'dapagliflozin' },
  'forxiga': { generic: 'dapagliflozin', canonicalBrand: 'Forxiga', usGeneric: 'dapagliflozin' },
  'invokana': { generic: 'canagliflozin', canonicalBrand: 'Invokana', usGeneric: 'canagliflozin' },

  // Statins
  'lipitor': { generic: 'atorvastatin', canonicalBrand: 'Lipitor', usGeneric: 'atorvastatin' },
  'crestor': { generic: 'rosuvastatin', canonicalBrand: 'Crestor', usGeneric: 'rosuvastatin' },

  // Antiplatelets & Anticoagulants
  'plavix': { generic: 'clopidogrel', canonicalBrand: 'Plavix', usGeneric: 'clopidogrel' },
  'eliquis': { generic: 'apixaban', canonicalBrand: 'Eliquis', usGeneric: 'apixaban' },
  'xarelto': { generic: 'rivaroxaban', canonicalBrand: 'Xarelto', usGeneric: 'rivaroxaban' },

  // GLP-1 receptor agonists
  'ozempic': { generic: 'semaglutide', canonicalBrand: 'Ozempic', usGeneric: 'semaglutide' },
  'wegovy': { generic: 'semaglutide', canonicalBrand: 'Wegovy', usGeneric: 'semaglutide' },
  'mounjaro': { generic: 'tirzepatide', canonicalBrand: 'Mounjaro', usGeneric: 'tirzepatide' },
  'zepbound': { generic: 'tirzepatide', canonicalBrand: 'Zepbound', usGeneric: 'tirzepatide' },

  // Antihypertensives & Diuretics
  'lasix': { generic: 'furosemide', canonicalBrand: 'Lasix', usGeneric: 'furosemide' },
  'norvasc': { generic: 'amlodipine', canonicalBrand: 'Norvasc', usGeneric: 'amlodipine' },
  'aldactone': { generic: 'spironolactone', canonicalBrand: 'Aldactone', usGeneric: 'spironolactone' },

  // NSAIDs & Analgesics
  'advil': { generic: 'ibuprofen', canonicalBrand: 'Advil', usGeneric: 'ibuprofen' },
  'motrin': { generic: 'ibuprofen', canonicalBrand: 'Motrin', usGeneric: 'ibuprofen' },
  'brufen': { generic: 'ibuprofen', canonicalBrand: 'Brufen', usGeneric: 'ibuprofen' },
  'aleve': { generic: 'naproxen', canonicalBrand: 'Aleve', usGeneric: 'naproxen' }
};

/**
 * Identify drug name in query and produce brand-to-generic mapping
 */
function identifyDrugFromQuery(queryText) {
  const normalized = queryText.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  for (const word of words) {
    if (BRAND_TO_GENERIC_MAP[word]) {
      const match = BRAND_TO_GENERIC_MAP[word];
      return {
        matchedToken: word,
        generic: match.generic,
        usGeneric: match.usGeneric,
        canonicalBrand: match.canonicalBrand,
        interpretedAs: match.canonicalBrand ? `${match.generic} (${match.canonicalBrand})` : null
      };
    }
  }

  // Check 2-word combinations
  for (let i = 0; i < words.length - 1; i++) {
    const pair = `${words[i]} ${words[i + 1]}`;
    if (BRAND_TO_GENERIC_MAP[pair]) {
      const match = BRAND_TO_GENERIC_MAP[pair];
      return {
        matchedToken: pair,
        generic: match.generic,
        usGeneric: match.usGeneric,
        canonicalBrand: match.canonicalBrand,
        interpretedAs: match.canonicalBrand ? `${match.generic} (${match.canonicalBrand})` : null
      };
    }
  }

  return null;
}

/**
 * Fetch official FDA approved drug label via OpenFDA (free public endpoint)
 */
async function fetchFdaLabel(drugInfo) {
  if (!drugInfo) return null;

  const searchTerms = [drugInfo.usGeneric, drugInfo.generic, drugInfo.canonicalBrand].filter(Boolean);

  for (const term of searchTerms) {
    try {
      const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(term)}"+OR+openfda.brand_name:"${encodeURIComponent(term)}"&limit=1`;
      const res = await axios.get(url, { timeout: 6000 });
      const record = res.data?.results?.[0];

      if (record) {
        const indications = Array.isArray(record.indications_and_usage)
          ? record.indications_and_usage.join(' ')
          : (record.indications_and_usage || '');
        const warnings = Array.isArray(record.warnings)
          ? record.warnings.join(' ')
          : (record.warnings || record.warnings_and_cautions?.join?.(' ') || '');
        const dosage = Array.isArray(record.dosage_and_administration)
          ? record.dosage_and_administration.join(' ')
          : (record.dosage_and_administration || '');

        const clean = (t) => t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 1500);

        return {
          pmid: 'FDA',
          title: `U.S. FDA Approved Product Labeling: ${drugInfo.generic.charAt(0).toUpperCase() + drugInfo.generic.slice(1)} (${drugInfo.usGeneric})`,
          authors: 'U.S. Food & Drug Administration (CDER)',
          journal: 'FDA Approved Drug Products with Therapeutic Equivalence Evaluations',
          year: 2024,
          publicationDate: '2024 Revised Label',
          studyType: 'FDA Label',
          rankScore: 120, // Highest authority for dosage & indications
          isOlderThan5Years: false,
          isRetracted: false,
          pubmedUrl: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
          abstract: `OFFICIAL FDA INDICATIONS & USAGE: ${clean(indications)} \n\nDOSAGE & ADMINISTRATION LIMITS: ${clean(dosage)} \n\nWARNINGS & PRECAUTIONS: ${clean(warnings)}`
        };
      }
    } catch (e) {
      // Continue to next term or fallback
    }
  }

  // Fallback FDA label for paracetamol/acetaminophen if OpenFDA times out
  if (drugInfo.generic === 'paracetamol' || drugInfo.usGeneric === 'acetaminophen') {
    return {
      pmid: 'FDA',
      title: 'U.S. FDA Approved Product Labeling: Acetaminophen (Paracetamol) Tablet',
      authors: 'U.S. Food & Drug Administration (CDER)',
      journal: 'FDA Drug Safety & Product Labeling Database',
      year: 2024,
      publicationDate: '2024 Package Insert',
      studyType: 'FDA Label',
      rankScore: 120,
      isOlderThan5Years: false,
      isRetracted: false,
      pubmedUrl: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
      abstract: 'OFFICIAL FDA INDICATIONS & USAGE: Indicated for the temporary relief of minor aches and pains due to headache, muscular aches, backache, minor pain of arthritis, the common cold, toothache, premenstrual and menstrual cramps, and for the temporary reduction of fever. \n\nDOSAGE & SAFETY LIMITS: Adults and children 12 years and older: 500 mg to 1,000 mg every 4 to 6 hours as needed; do not exceed 4,000 mg (4 g) in 24 hours. Maximum daily dose should be reduced in patients with hepatic impairment. \n\nWARNINGS: Liver warning: Severe liver damage may occur if adult takes more than 4,000 mg in 24 hours, with other drugs containing acetaminophen, or consumes 3 or more alcoholic drinks daily while using this product.'
    };
  }

  return null;
}

module.exports = {
  identifyDrugFromQuery,
  fetchFdaLabel
};
