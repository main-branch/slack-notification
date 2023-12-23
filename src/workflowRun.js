class PullRequest {
  constructor(title, number, openedBy, htmlUrl) {
    this.title = title;
    this.number = number;
    this.openedBy = openedBy;
    this.htmlUrl = htmlUrl;
  }
}

class Commit {
  constructor(sha, message, pushedBy, htmlUrl) {
    this.sha = sha;
    this.message = message;
    this.pushedBy = pushedBy;
    this.htmlUrl = htmlUrl;
  }
}

class Job {
  constructor(id, name, status, conclusion, htmlUrl) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.conclusion = conclusion;
    this.htmlUrl = htmlUrl;
  }
}

class Repository {
  constructor(id, owner, repo, htmlUrl) {
    this.id = id;
    this.owner = owner;
    this.repo = repo;
    this.htmlUrl = htmlUrl;
  }
}

// Create a mocked core object
core = {
  getInput: function (name) {
    // return different values based on name
    if (name === 'repository') {
      return 'octocat/hello-world';
    }
    else if (name === 'per_page') {
      return '30';
    }
    else if (name === 'github_token') {
      return '1234567890';
    }
    else {
      return undefined;
    }
  }
}

// Create a mocked github object
github = {
  context: {
    repo: {
      owner: 'octocat',
      repo: 'hello-world'
    },
    eventName: 'pr',
    runId: 123456,
    job: 123456,
    payload: {
      pull_request: {
        title: 'My Pull Request',
        number: 1,
        user: {
          login: 'octocat'
        },
        html_url: 'https://github.com/octocat/hello-world/pull/1',
      },
      head_commit: {
        id: '1234567890',
        message: 'My commit message'
      },
      repository: {
        id: 123456
      }

class WorkflowRun {
  constructor(core, github, process_env) {
    this.core = core;
    this.github = github;
    this.process_env = process_env;

    const owner = github.context.repo.owner;
    const repository = core.getInput('repository') || github.context.repo.repo;
    const runId = github.context.runId;
    const jobs = jobsForWorkflowRun(owner, repository, runId);
    const pullRequest = github.context.payload.pull_request;
    const commit = github.context.payload.head_commit;
    const serverUrl = process_env.GITHUB_SERVER_URL;

    this.id = runId;
    this.htmlUrl = `${serverUrl}/${owner}/${repository}/actions/runs/${runId}`;
    this.status = workflowRunStatus(jobs);
    this.triggerEventType = github.context.eventName;

    this.repository = new Repository(github.context.payload.repository.id, owner, repository, `${serverUrl}/${owner}/${repository}`);

    if (pullRequest) {
      this.pullRequest = new PullRequest(pullRequest.title, pullRequest.number, pullRequest.user.login, pullRequest.html_url);
    }
    else {
      this.pullRequest = undefined;
    }

    if (commit) {
      this.commit = new Commit(commit.id, commit.message, commit.author.username, commit.url);
    }
    else {
      this.commit = undefined;
    }

    this.jobs = jobs.map(job => {
      return Job.new(job.id, job.name, job.status, job.conclusion, job.html_url);
    });

    function workflowRunStatus(jobs) {
      jobs.filter(job => job.status === 'completed').every(job => job.conclusion === 'success') ? 'success' : 'failure';
    }

    function jobsForWorkflowRun(owner, repository, runId) {
      const perPage = parseInt(core.getInput('per_page') || '30');
      const token = core.getInput('github_token');
      const octokit = github.getOctokit(token);

      const response = await octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo: repository,
        run_id: runId,
        per_page: parseInt(perPage)
      })

      // filter out the current job
      return response.data.jobs.filter(job => job.id !== github.context.job);
    }
  }
}

module.exports = { WorkflowRun };
