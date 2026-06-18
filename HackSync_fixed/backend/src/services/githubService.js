import axios from "axios";

export function parseRepoUrl(repoUrl) {
  const parts = repoUrl.split("/");

  return {
    owner: parts[3],
    repo: parts[4],
  };
}

export async function getRepoCommits(owner, repo) {

  const headers = {
    Accept: "application/vnd.github+json",
  };

  if (
    process.env.GITHUB_TOKEN &&
    process.env.GITHUB_TOKEN !== "your_token_here"
  ) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/commits`,
    { headers }
  );

  return response.data;
}
export async function getRepoPRs(owner, repo) {
  const headers = {
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
    { headers }
  );

  return response.data;
}
export async function getRepoIssues(owner, repo) {
  const headers = {
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`,
    { headers }
  );

  return response.data;
}
export function analyzeContributions(commits, prs, issues) {
  const users = {};

  commits.forEach((commit) => {
    const username = commit.author?.login;

    if (!username) return;

    if (!users[username]) {
      users[username] = {
        username,
        commits: 0,
        prs: 0,
        issues: 0,
        score: 0,
      };
    }

    users[username].commits++;
  });

  prs.forEach((pr) => {
    const username = pr.user?.login;

    if (!username) return;

    if (!users[username]) {
      users[username] = {
        username,
        commits: 0,
        prs: 0,
        issues: 0,
        score: 0,
      };
    }

    users[username].prs++;
  });

  issues.forEach((issue) => {
    if (issue.pull_request) return;

    const username = issue.user?.login;

    if (!username) return;

    if (!users[username]) {
      users[username] = {
        username,
        commits: 0,
        prs: 0,
        issues: 0,
        score: 0,
      };
    }

    users[username].issues++;
  });

  let totalScore = 0;

  Object.values(users).forEach((user) => {
    user.score =
      user.commits * 1 +
      user.prs * 5 +
      user.issues * 2;

    totalScore += user.score;
  });

  Object.values(users).forEach((user) => {
    user.percentage =
      totalScore > 0
        ? Number(
            ((user.score / totalScore) * 100).toFixed(2)
          )
        : 0;
        user.status = "Normal";

if (user.percentage < 5) {
  user.status = "Low Participation";
}

if (user.percentage > 70) {
  user.status = "Dominating Contributions";
}
  });

  return Object.values(users).sort(
    (a, b) => b.score - a.score
  );
}