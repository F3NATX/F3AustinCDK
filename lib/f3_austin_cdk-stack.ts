import { CfnVPC, Peer, Port, SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import { App, Stack, StackProps } from '@aws-cdk/core';
import { Db } from './database/db';
import { Webserver } from './webserver/webserver';

export class F3AustinCdkStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'VPC');
    const ec2SecurityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Allow access to ec2 instances',
      allowAllOutbound: true,
      });
    ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'allow ssh access from the world');
    ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), "Http traffic to the webserver");
    ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), "Secured http traffic to the webserver"); 

    const db = new Db(this, vpc, ec2SecurityGroup);

    new Webserver(this, vpc, ec2SecurityGroup, db);


  }
}
