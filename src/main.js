const core = require('@actions/core');
const github = require('@actions/github');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Prototype for the workflow run object:
//
// const workflowRun = {
//   'id': '0',
//   'htmlUrl': '',
//   'status': 'success', // success, failure, or cancelled
//   'triggerEventType': 'pull_request', // push, pull_request, or workflow_dispatch
//   'pullRequest': { // only present if triggerEvent is pull_request
//     'title': 'Update README.md',
//     'number': 1,
//     'openedBy': 'user',
//     'htmlUrl': 'https://...'
//   },
//   'commit': {
//     'sha': 'sha',
//     'message': 'message',
//     'pushedBy': 'user',
//     'htmlUrl': 'https://...'
//   },
//   'jobs': [
//     {
//       'id': 0,
//       'name': 'build',
//       'status': 'completed',
//       'conclusion': 'success',
//       'htmlUrl': 'https://...'
//     }
//   ],
//   'repository': {
//     'id': 0,
//     'owner': 'owner',
//     'repo': 'repo',
//     'htmlUrl': 'https://...'
//   }
// }

function workflowRunStatus(jobs) {
  jobs.filter(job => job.status === 'completed').every(job => job.conclusion === 'success') ? 'success' : 'failure';
}

async function jobsForWorkflowRun(owner, repository, runId) {
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

async function workflowRunObject() {
  const owner = github.context.repo.owner;
  const repository = core.getInput('repository') || github.context.repo.repo;
  const runId = github.context.runId;
  const jobs = await jobsForWorkflowRun(owner, repository, runId);
  const pullRequest = github.context.payload.pull_request;
  const commit = github.context.payload.head_commit;
  const serverUrl = process.env.GITHUB_SERVER_URL;

  return {
    'id': runId,
    'htmlUrl': `${serverUrl}/${owner}/${repository}/actions/runs/${runId}`,
    'status': workflowRunStatus(jobs),
    'triggerEventType': github.context.eventName,
    'pullRequest': pullRequest ? {
      'title': pullRequest.title,
      'number': pullRequest.number,
      'openedBy': pullRequest.user.login,
      'htmlUrl': pullRequest.html_url
    } : undefined,
    'commit': commit ? {
      'sha': commit.id,
      'message': commit.message,
      'pushedBy': commit.author.username,
      'htmlUrl': commit.url
    } : undefined,
    'jobs': jobs.map(job => {
      return {
        'id': job.id,
        'name': job.name,
        'status': job.status,
        'conclusion': job.conclusion,
        'htmlUrl': job.html_url
      }
    }),
    'repository': {
      'id': github.context.payload.repository.id,
      'owner': owner,
      'repo': repository,
      'htmlUrl': `${serverUrl}/${owner}/${repository}`
    }
  }
}

async function run() {
  try {
    const workflowRun = await workflowRunObject();
    // core.info(JSON.stringify(workflowRun, null, 2));

    const templatePath = path.join(__dirname, 'message.hbs');

    // Read the template file
    const source = fs.readFileSync(templatePath, 'utf-8');

    // Compile the template
    const template = Handlebars.compile(source);

    Handlebars.registerHelper('jobStatueEmoji', jobStatusEmoji);
    Handlebars.registerHelper('workflowRunStatusEmoji', workflowRunStatusEmoji);
    Handlebars.registerHelper('workflowRunStatus', workflowRunStatus);

    // Render the template
    const result = template(workflowRun);

    core.info(result);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

// create a map of job statuses to slack emojis
const jobStatusEmojis = {
  queued: ':hourglass:',
  in_progress: ':hourglass:',
};

// create a map of job conclusions to slack emojis
const jobConclusionEmojis = {
  success: 'white_check_mark',
  failure: 'x',
  neutral: 'neutral_face',
  cancelled: 'no_entry_sign',
  skipped: 'black_right_pointing_double_triangle_with_vertical_bar',
  timed_out: 'hourglass',
  action_required: 'warning'
};

function jobStatusEmoji(status, conclusion) {
  if (status === 'completed') {
    return jobConclusionEmojis[conclusion];
  } else {
    return jobStatusEmojis[status];
  }
}

function workflowRunStatusEmoji(status) {
  if (status === 'success') {
    return 'sunny';
  } else {
    return 'rain_cloud';
  }
}

function workflowRunStatus(status) {
  return status.toUpperCase();
}

// async function run2() {
//   try {
//     const token = core.getInput('github_token');
//     const repository = core.getInput('repository') || github.context.repo.repo;
//     const owner = github.context.repo.owner;
//     const runId = core.getInput('run_id') || github.context.runId;
//     const perPage = core.getInput('per_page') || 30;
//     const verbose = core.getInput('verbose') || false;

//     const octokit = github.getOctokit(token);

//     const response = await octokit.rest.actions.listJobsForWorkflowRun({
//       owner,
//       repo: repository,
//       run_id: runId,
//       per_page: parseInt(perPage)
//     })

//     // filter out the current job
//     const jobs = response.data.jobs.filter(job => job.id !== github.context.job);

//     // Create a slack message using a heredoc string template to report the workflow status
//     const workflowStatus = workflowSucceeded(jobs) ? 'SUCCESS :sunny:' : 'FAILURE :rain_cloud:';

//     const pullRequest = github.context.payload.pull_request;
//     const serverUrl = process.env.GITHUB_SERVER_URL;
//     const runUrl = `${serverUrl}/${owner}/${repository}/actions/runs/${runId}`;
//     const title = `[${pullRequest.title}](${runUrl})`;

//     // ref should be a link to the pull request and the link text should be the repository owner/name and the pull request number
//     const ref = `[${owner}/${repository}#${pullRequest.number}](${pullRequest.html_url})`;

//     const jobHeading = '\nAll Jobs:\n* ';
//     const jobsList = jobs.map(job => {
//       return `${jobEmoji(job)} [${job.name}](${job.html_url}) ${job.name}`;
//     });

//     const message = `${workflowStatus} ${title} (${ref})${jobHeading}${jobsList.join('\n* ')}`;
//     core.info(`\n\nMessage:\n${message}`);

//     core.setOutput('jobs', jobs);
//   } catch (error) {
//     core.setFailed(error.message);
//   }
// }

module.exports = { run };
