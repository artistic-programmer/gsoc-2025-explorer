import type { CategoryRule } from './types';

let n = 0;
export const newRuleId = () => `rule-${Date.now().toString(36)}-${n++}`;

/**
 * STARTER TEMPLATE — these are editable, user-level grouping rules, NOT data from
 * the CSV. They only ever compare against the Technologies / Topics tags that
 * the CSV itself lists (exact tag match), and every category badge in the app is
 * labelled "rule-based". Edit or clear them in Categories → Rules.
 */
export const STARTER_RULES: Omit<CategoryRule, 'id'>[] = [
  {
    name: 'Web Development',
    field: 'both',
    match: 'exact',
    keywords: ['web', 'web development', 'web apps', 'web application', 'web applications', 'frontend', 'front-end', 'backend', 'web framework', 'web technologies', 'webdev', 'html', 'css', 'react', 'vue', 'angular', 'django', 'node.js'],
  },
  {
    name: 'AI / Machine Learning',
    field: 'both',
    match: 'exact',
    keywords: ['machine learning', 'ai', 'artificial intelligence', 'deep learning', 'ml', 'ai/ml', 'generative ai', 'llm', 'llms', 'nlp', 'natural language processing', 'computer vision', 'neural networks', 'pytorch', 'tensorflow', 'data science'],
  },
  {
    name: 'Developer Tools',
    field: 'topics',
    match: 'exact',
    keywords: ['developer tools', 'devtools', 'dev tools', 'tools', 'tooling', 'ide', 'testing', 'ci', 'ci/cd', 'build systems', 'debugging', 'static analysis', 'version control', 'compilers', 'compiler', 'programming languages', 'code analysis'],
  },
  {
    name: 'Cloud & Infrastructure',
    field: 'both',
    match: 'exact',
    keywords: ['cloud', 'cloud computing', 'devops', 'kubernetes', 'docker', 'infrastructure', 'containers', 'networking', 'serverless', 'observability', 'monitoring', 'cloud native', 'big data'],
  },
  {
    name: 'Security',
    field: 'topics',
    match: 'exact',
    keywords: ['security', 'cybersecurity', 'cryptography', 'privacy', 'vulnerabilities', 'fuzzing', 'malware', 'authentication', 'blockchain'],
  },
  {
    name: 'Scientific Computing & Data',
    field: 'topics',
    match: 'exact',
    keywords: ['scientific computing', 'science', 'data science', 'mathematics', 'simulation', 'bioinformatics', 'neuroscience', 'astronomy', 'physics', 'chemistry', 'data analysis', 'visualization', 'data visualization', 'geoinformation', 'hpc', 'high performance computing', 'numerical computing', 'biology', 'medical imaging', 'healthcare'],
  },
  {
    name: 'Education',
    field: 'topics',
    match: 'exact',
    keywords: ['education', 'learning', 'e-learning', 'teaching', 'accessibility', 'documentation'],
  },
  {
    name: 'Mobile',
    field: 'both',
    match: 'exact',
    keywords: ['mobile', 'android', 'ios', 'flutter', 'react native', 'kotlin', 'swift'],
  },
  {
    name: 'Graphics & Media',
    field: 'topics',
    match: 'exact',
    keywords: ['graphics', '3d', '3d graphics', '2d graphics', 'audio', 'video', 'multimedia', 'games', 'game development', 'gamedev', 'music', 'image processing', 'computer graphics', 'rendering'],
  },
  {
    name: 'Systems & Hardware',
    field: 'topics',
    match: 'exact',
    keywords: ['operating systems', 'embedded', 'embedded systems', 'robotics', 'hardware', 'firmware', 'kernel', 'linux', 'risc-v', 'fpga', 'iot', 'drivers', 'virtualization', 'autonomous driving'],
  },
];

export const starterRules = (): CategoryRule[] => STARTER_RULES.map((r) => ({ ...r, id: newRuleId() }));
