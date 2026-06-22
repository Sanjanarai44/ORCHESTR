import axios from "axios";

export function parseRepoUrl(repoUrl) {
  // Strip trailing slash and .git suffix before splitting
  const cleaned = repoUrl.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleaned.split("/");
  return {
    owner: parts[3],
    repo: parts[4],
  };
}

function buildHeaders() {
  const headers = { Accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN;
  if (token && token !== "your_token_here") {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getRepoCommits(owner, repo) {
  const headers = buildHeaders();
  let commits = [];
  let page = 1;

  while (true) {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      { headers, params: { per_page: 100, page } }
    );

    const batch = response.data;
    if (!batch.length) break;
    commits = commits.concat(batch);

    // GitHub returns fewer than 100 items on the last page
    if (batch.length < 100) break;
    page++;
  }

  return commits;
}

export async function getRepoPRs(owner, repo) {
  const headers = buildHeaders();
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    { headers, params: { state: "all", per_page: 100 } }
  );
  return response.data;
}

export async function getRepoIssues(owner, repo) {
  const headers = buildHeaders();
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    { headers, params: { state: "all", per_page: 100 } }
  );
  return response.data;
}

export function analyzeContributions(commits, prs, issues) {
  const users = {};

  function ensure(username) {
    if (!users[username]) {
      users[username] = { username, commits: 0, prs: 0, issues: 0, score: 0 };
    }
  }

  commits.forEach((commit) => {
    const username = commit.author?.login;
    if (!username) return;
    ensure(username);
    users[username].commits++;
  });

  prs.forEach((pr) => {
    const username = pr.user?.login;
    if (!username) return;
    ensure(username);
    users[username].prs++;
  });

  issues.forEach((issue) => {
    // GitHub's issues endpoint returns PRs too — filter them out
    if (issue.pull_request) return;
    const username = issue.user?.login;
    if (!username) return;
    ensure(username);
    users[username].issues++;
  });

  let totalScore = 0;

  Object.values(users).forEach((user) => {
    user.score = user.commits * 1 + user.prs * 5 + user.issues * 2;
    totalScore += user.score;
  });

  Object.values(users).forEach((user) => {
    user.percentage =
      totalScore > 0
        ? Number(((user.score / totalScore) * 100).toFixed(2))
        : 0;

    user.status = "Normal";
    if (user.percentage < 5) user.status = "Low Participation";
    if (user.percentage > 70) user.status = "Dominating Contributions";
  });

  return Object.values(users).sort((a, b) => b.score - a.score);
}