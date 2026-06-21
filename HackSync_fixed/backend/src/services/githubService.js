import axios from "axios";

export function parseRepoUrl(repoUrl) {
  const parts = repoUrl.replace(/\.git\/?$/, "").split("/");
  return {
    owner: parts[3],
    repo: parts[4],
  };
}

function buildHeaders() {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== "your_token_here") {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// Fetches ALL pages from a GitHub API endpoint using Link header pagination
async function fetchAllPages(url) {
  const headers = buildHeaders();
  const results = [];
  let nextUrl = `${url}${url.includes("?") ? "&" : "?"}per_page=100`;

  while (nextUrl) {
    const response = await axios.get(nextUrl, { headers });
    results.push(...response.data);

    // Parse Link header for next page
    const linkHeader = response.headers["link"];
    const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }

  return results;
}

export async function getRepoCommits(owner, repo) {
  return fetchAllPages(`https://api.github.com/repos/${owner}/${repo}/commits`);
}

export async function getRepoPRs(owner, repo) {
  return fetchAllPages(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all`);
}

export async function getRepoIssues(owner, repo) {
  return fetchAllPages(`https://api.github.com/repos/${owner}/${repo}/issues?state=all`);
}

export function analyzeContributions(commits, prs, issues) {
  const users = {};

  commits.forEach((commit) => {
    const username = commit.author?.login;
    if (!username) return;
    if (!users[username]) users[username] = { username, commits: 0, prs: 0, issues: 0, score: 0 };
    users[username].commits++;
  });

  prs.forEach((pr) => {
    const username = pr.user?.login;
    if (!username) return;
    if (!users[username]) users[username] = { username, commits: 0, prs: 0, issues: 0, score: 0 };
    users[username].prs++;
  });

  issues.forEach((issue) => {
    if (issue.pull_request) return; // skip PRs listed under issues
    const username = issue.user?.login;
    if (!username) return;
    if (!users[username]) users[username] = { username, commits: 0, prs: 0, issues: 0, score: 0 };
    users[username].issues++;
  });

  let totalScore = 0;
  Object.values(users).forEach((user) => {
    user.score = user.commits * 1 + user.prs * 5 + user.issues * 2;
    totalScore += user.score;
  });

  Object.values(users).forEach((user) => {
    user.percentage = totalScore > 0 ? Number(((user.score / totalScore) * 100).toFixed(2)) : 0;
    user.status = "Normal";
    if (user.percentage < 5) user.status = "Low Participation";
    if (user.percentage > 70) user.status = "Dominating Contributions";
  });

  return Object.values(users).sort((a, b) => b.score - a.score);
}