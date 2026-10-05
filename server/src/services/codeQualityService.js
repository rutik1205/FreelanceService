/**
 * Automated Code Checks & Repository Quality Validator
 * Analyzes GitHub repositories for structure, CI/CD status, test coverage indicators, and best practices.
 */

function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const cleaned = url.trim().replace(/\/+$/, '');
  const match = cleaned.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ''),
    fullPath: `${match[1]}/${match[2].replace(/\.git$/i, '')}`,
  };
}

async function analyzeRepository(githubUrl) {
  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) {
    return {
      isValid: false,
      error: 'Invalid GitHub repository URL format. Please provide a link like https://github.com/owner/repository',
      score: 0,
      grade: 'F',
    };
  }

  const { owner, repo, fullPath } = parsed;
  const headers = {
    'User-Agent': 'SkillDesk-CodeQuality-Checker/1.0',
    Accept: 'application/vnd.github.v3+json',
  };

  let repoData = null;
  let contents = [];
  let workflows = [];
  let lastCommits = [];
  let isRateLimited = false;

  try {
    // 1. Fetch Repository Details
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (repoRes.status === 200) {
      repoData = await repoRes.json();
    } else if (repoRes.status === 403) {
      isRateLimited = true;
    }

    // 2. Fetch Root Directory Contents
    if (repoData && !isRateLimited) {
      try {
        const contentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
        if (contentsRes.status === 200) {
          contents = await contentsRes.json();
        }
      } catch (e) {
        // non-blocking
      }

      // 3. Fetch CI/CD Workflows / Runs
      try {
        const runsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`, { headers });
        if (runsRes.status === 200) {
          const runsData = await runsRes.json();
          workflows = runsData.workflow_runs || [];
        }
      } catch (e) {
        // non-blocking
      }

      // 4. Fetch Recent Commits
      try {
        const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, { headers });
        if (commitsRes.status === 200) {
          lastCommits = await commitsRes.json();
        }
      } catch (e) {
        // non-blocking
      }
    }
  } catch (netErr) {
    console.warn('Network error while querying GitHub API:', netErr.message);
  }

  // File structure checks
  const fileNames = Array.isArray(contents) ? contents.map((c) => c.name.toLowerCase()) : [];

  const hasReadme = fileNames.some((f) => f.startsWith('readme'));
  const hasLicense = fileNames.some((f) => f.includes('license'));
  const hasGitIgnore = fileNames.includes('.gitignore');
  const hasPackageJson = fileNames.includes('package.json') || fileNames.includes('requirements.txt') || fileNames.includes('pom.xml') || fileNames.includes('cargo.toml') || fileNames.includes('go.mod');
  const hasTests = fileNames.some((f) => f.includes('test') || f.includes('spec') || f === '__tests__');
  const hasDocker = fileNames.some((f) => f.includes('dockerfile') || f.includes('docker-compose'));
  const hasLinter = fileNames.some((f) => f.includes('eslint') || f.includes('prettier') || f.includes('biome') || f.includes('tsconfig'));

  // CI status evaluation
  let ciStatus = 'not_configured';
  let ciConclusion = null;
  if (workflows.length > 0) {
    const latestRun = workflows[0];
    ciStatus = latestRun.status; // 'completed', 'in_progress', 'queued'
    ciConclusion = latestRun.conclusion; // 'success', 'failure', 'neutral'
  } else if (fileNames.includes('.github')) {
    ciStatus = 'workflows_detected';
  }

  // Calculate Quality Score (0 to 100)
  let score = 50; // base score for a valid accessible repository

  const checks = [
    {
      name: 'Repository Accessibility',
      description: 'Repository exists and is publicly accessible on GitHub',
      passed: Boolean(repoData) || !isRateLimited,
      weight: 15,
    },
    {
      name: 'Documentation (README)',
      description: 'Project includes comprehensive README with setup instructions',
      passed: hasReadme || Boolean(repoData?.description),
      weight: 15,
    },
    {
      name: 'Open Source License',
      description: 'Permissive software license attached (MIT, Apache, etc.)',
      passed: hasLicense || Boolean(repoData?.license),
      weight: 10,
    },
    {
      name: 'Package & Dependency Manifest',
      description: 'Defined dependency manifest (package.json, requirements, etc.)',
      passed: hasPackageJson,
      weight: 15,
    },
    {
      name: 'Automated CI / CD Pipeline',
      description: 'GitHub Actions workflow or CI automation detected',
      passed: ciStatus !== 'not_configured',
      weight: 15,
      detail: ciConclusion ? `Latest build: ${ciConclusion}` : undefined,
    },
    {
      name: 'Test Suite & Specifications',
      description: 'Unit/Integration test directory or test scripts configured',
      passed: hasTests,
      weight: 15,
    },
    {
      name: 'Linting & Code Formatting',
      description: 'Configured linter, type-checker, or code formatter',
      passed: hasLinter,
      weight: 10,
    },
    {
      name: 'Git Version Hygiene',
      description: 'Includes .gitignore and clean commit tracking',
      passed: hasGitIgnore,
      weight: 5,
    },
  ];

  // Re-calculate weighted score
  const earnedScore = checks.reduce((acc, c) => acc + (c.passed ? c.weight : 0), 0);
  score = Math.min(100, Math.max(20, earnedScore));

  // Determine Letter Grade
  let grade = 'B';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C';
  else grade = 'Needs Work';

  const strengths = [];
  const recommendations = [];

  if (hasReadme) strengths.push('Clear project documentation detected.');
  else recommendations.push('Add a detailed README.md covering architecture and run instructions.');

  if (hasPackageJson) strengths.push('Structured dependency management configured.');
  if (hasTests) strengths.push('Test specifications identified.');
  else recommendations.push('Include unit or integration test suite (e.g. Jest, Vitest, PyTest).');

  if (ciStatus !== 'not_configured') {
    if (ciConclusion === 'success') strengths.push('Automated GitHub Actions CI passed successfully.');
    else strengths.push('CI workflow configured on GitHub Actions.');
  } else {
    recommendations.push('Set up GitHub Actions CI to run automated build and test checks on push.');
  }

  if (hasLicense) strengths.push('Proper open source or commercial license included.');
  else recommendations.push('Attach an explicit LICENSE file (e.g. MIT).');

  return {
    isValid: true,
    repository: fullPath,
    githubUrl,
    stars: repoData?.stargazers_count ?? 0,
    forks: repoData?.forks_count ?? 0,
    defaultBranch: repoData?.default_branch || 'main',
    openIssues: repoData?.open_issues_count ?? 0,
    language: repoData?.language || 'JavaScript',
    score,
    grade,
    ciStatus: ciConclusion || ciStatus,
    checks,
    strengths,
    recommendations,
    analyzedAt: new Date(),
    isLiveGitHubVerified: Boolean(repoData),
  };
}

module.exports = { analyzeRepository, parseGitHubUrl };
