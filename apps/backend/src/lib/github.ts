import { Octokit } from '@octokit/rest';

const octokit: Octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export { octokit };
