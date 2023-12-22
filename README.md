# main-branch/slack-notification

[![Continuous Integration](https://github.com/main-branch/slack-notification/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/main-branch/slack-notification/actions/workflows/continuous-integration.yml)

Report the results of a CI build workflow to a Slack channel.

Shows the overall SUCCESS/FAIL of the current Workflow run and the status of
each job. The status for each job in a matrix is reported.

## Usage

See [action.yml](action.yml) for the various `inputs` this action supports.

We recommend this action to be used in a dedicated job at the end of your
workflow.

```yaml
jobs:
  # Build job
  build:
    # <Not provided for brevity>
    # At a minimum this job should upload artifacts using actions/upload-pages-artifact

  # Slack notification job
  notify:
    # Add a dependency to the build job
    needs: build

    steps:
      - name: Notify
        uses: main-branch/slack-notification@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          slack_token: ${{ secrets.SLACK_TOKEN }}
```

### Inputs 📥

| Input          | Required? | Default               | Description                                                                            |
| -------------- | --------- | --------------------- | -------------------------------------------------------------------------------------- |
| `github_token` | `true`    | `${{ github.token }}` | The GitHub token used to create an authenticated client - Provided for you by default! |
| `slack_token`  | `true`    | `undefined`           | The token used to send Slack messages.                                                 |

### Outputs 📤

| Output         | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| `workflow_run` | Info about the workflow run including the status of all jobs |

### Environment Variables 🌎

| Variable | Description |
| -------- | ----------- |
| None     | N/A         |
