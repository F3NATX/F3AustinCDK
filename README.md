# F3Austin CDK Stack

This project is the infrastructure for the F3Austin AWS resources, its spins up a webserver that needs some configuration, but is then ready to host the F3Austin wordpress based website.

See https://github.com/F3NATX for all the related projects

## Useful commands

-   `npm run build` compile typescript to js, run linter, and run prettier
-   `npm run test` perform the jest unit tests
-   `npm run cdk deploy` deploy this stack to your default AWS account/region
-   `npm run cdk diff` compare deployed stack with current state
-   `npm run cdk synth` emits the synthesized CloudFormation template

## Setup instructions

An AWS account is required to work with this system, to add your own account and use it as you'd like do the following:

-   Log onto the AWS Console in the IAM Users screen, https://console.aws.amazon.com/iam/home?region=us-east-1#/users
-   Create a new user called `Deployer`
-   Select `Programmatic access` access type
-   Add this user to the `Administrators` group
-   If you need to go to the `Security Credentials` page on the user account
-   Create a new Access Key, copy both the key id and the secret access key into a secure place.
-   Add them to your aws credentials file, see https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
-   Check that the credentials work with `npm run cdk diff` from the command line, it should tell your environment has any difference with what is deployed.
