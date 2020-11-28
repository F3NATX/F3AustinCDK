import { App, Stack, StackProps } from '@aws-cdk/core';
import { Db } from './database/db';
import { Webserver } from './webserver/webserver';

export class F3AustinCdkStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    new Db(this);

    new Webserver(this);
  }
}
