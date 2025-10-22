# CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the Scrollbar Controller project.

## Overview

The project uses GitHub Actions for automated building, testing, and releasing. The CI/CD pipeline ensures code quality, builds the userscript, and handles releases automatically.

## Workflows

### 1. Build Workflow (`.github/workflows/build.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Manual trigger via workflow_dispatch

**Features:**
- Multi-version Node.js testing (18.x, 20.x)
- Code linting and formatting checks
- Automated testing
- Build validation
- Artifact upload with retention
- Build failure handling and logging
- Consolidated release artifacts for main branch

**Artifacts:**
- `userscript-node-{version}`: Build artifacts for each Node.js version
- `scrollbar-controller-release-{run_number}`: Consolidated release artifacts (main branch only)
- `build-logs-node-{version}-{run_number}`: Build logs on failure

### 2. Pull Request Check (`.github/workflows/pr-check.yml`)

**Triggers:**
- Pull requests to `main` or `develop` branches
- PR events: opened, synchronize, reopened

**Features:**
- Fast validation using single Node.js version (18.x)
- Code quality checks (linting, formatting)
- Build validation
- Detailed PR summaries
- Failure reporting with troubleshooting tips

### 3. Release Workflow (`.github/workflows/release.yml`)

**Triggers:**
- Push of version tags (v*)

**Features:**
- Automated GitHub releases
- Release asset generation
- Checksum generation for security
- Automatic release notes
- Pre-release detection (beta, alpha, rc tags)
- Release failure handling

**Assets:**
- `scrollbar-control.user.js`: Main userscript file
- `checksums.txt`: SHA256 checksums for verification

### 4. Status Workflow (`.github/workflows/status.yml`)

**Triggers:**
- Push to `main` branch
- Daily scheduled runs (00:00 UTC)
- Manual trigger

**Features:**
- Project health monitoring
- Daily automated checks
- Build system validation
- Project metrics reporting

## Local Testing

### Quick CI Test

Run the local CI simulation to test your changes before pushing:

```bash
npm run test:ci
# or
npm run ci
```

This script simulates the GitHub Actions workflow steps locally:
- Project structure validation
- Dependency installation
- Code linting
- Format checking
- Test execution
- Build validation

### Manual Testing Steps

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Run quality checks:**
   ```bash
   npm run lint
   npm run format:check
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Build and validate:**
   ```bash
   npm run clean
   npm run build
   ```

5. **Full validation:**
   ```bash
   npm run validate
   ```

## Workflow Status

You can monitor workflow status through:

- **GitHub Actions tab**: View all workflow runs
- **README badges**: Status badges show current build status
- **Pull Request checks**: Automatic status checks on PRs
- **Release pages**: Automated release information

## Build Artifacts

### Development Builds

- Generated on every push to main/develop
- Available for 30 days
- Include source maps and debug information
- Multiple Node.js versions tested

### Release Builds

- Generated on version tag pushes
- Permanent GitHub releases
- Include checksums for verification
- Optimized production builds

## Error Handling

### Build Failures

When builds fail, the system provides:
- Detailed error logs in job output
- Build log artifacts for download
- Failure summaries with troubleshooting tips
- Clear next steps for resolution

### Common Issues

1. **Linting errors**: Run `npm run lint:fix` to auto-fix issues
2. **Format issues**: Run `npm run format` to fix formatting
3. **Build errors**: Check build script and dependencies
4. **Test failures**: Ensure all tests pass locally

## Security

### Permissions

The workflows use minimal required permissions:
- `contents: read` for code checkout
- `actions: read` for artifact access
- `contents: write` for releases (release workflow only)

### Secrets

No custom secrets are required. The workflows use:
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- Standard GitHub Actions permissions

## Monitoring

### Build Health

- Daily status checks ensure project health
- Automated dependency updates (when configured)
- Build metrics tracking
- Performance monitoring

### Notifications

- Build status summaries in workflow runs
- PR check results with detailed feedback
- Release notifications with asset information
- Failure alerts with troubleshooting guidance

## Best Practices

### For Developers

1. **Before pushing:**
   - Run `npm run test:ci` locally
   - Ensure all checks pass
   - Test build output manually

2. **For pull requests:**
   - Keep changes focused and small
   - Ensure PR checks pass before requesting review
   - Address any CI feedback promptly

3. **For releases:**
   - Use semantic versioning (v1.0.0, v1.1.0, etc.)
   - Test thoroughly before tagging
   - Verify release assets after creation

### For Maintainers

1. **Workflow maintenance:**
   - Review workflow performance regularly
   - Update Node.js versions as needed
   - Monitor artifact storage usage

2. **Security updates:**
   - Keep GitHub Actions up to date
   - Review and update permissions as needed
   - Monitor for security advisories

## Troubleshooting

### Workflow Failures

1. **Check the logs**: Review the failed job output
2. **Test locally**: Use `npm run test:ci` to reproduce issues
3. **Check dependencies**: Ensure all dependencies are properly installed
4. **Verify permissions**: Check GitHub token permissions if needed

### Build Issues

1. **Clean build**: Run `npm run clean` before building
2. **Check Node version**: Ensure compatible Node.js version
3. **Verify files**: Check that all required files exist
4. **Test manually**: Run build steps individually

### Release Problems

1. **Tag format**: Ensure tags follow `v*` pattern
2. **Permissions**: Verify repository permissions for releases
3. **Build success**: Ensure build passes before tagging
4. **Asset paths**: Check that asset files exist and are accessible

## Configuration

### Workflow Customization

To modify workflows:

1. Edit files in `.github/workflows/`
2. Test changes in a feature branch
3. Verify with pull request checks
4. Merge when validated

### Adding New Checks

To add new validation steps:

1. Add to appropriate workflow file
2. Update local test script (`build/test-ci.js`)
3. Document new requirements
4. Test thoroughly before deployment

## Support

For CI/CD issues:

1. Check this documentation
2. Review workflow logs
3. Test locally with provided scripts
4. Create an issue with detailed information

The CI/CD system is designed to be robust and provide clear feedback for any issues that arise.
