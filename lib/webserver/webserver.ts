import { CfnOutput, Stack } from "@aws-cdk/core";
import { SubnetSelection, CloudFormationInit, InitCommand, InitConfig, InitPackage, Instance, InstanceClass, InstanceSize, InstanceType, MachineImage, Peer, Port, SecurityGroup, Subnet, Vpc, SubnetType, AmazonLinuxGeneration, InitServiceRestartHandle, InitService, InitSource} from "@aws-cdk/aws-ec2";

export class Webserver {
    constructor(stack: Stack) {
        const vpc = new Vpc(stack, 'VPC');

        const securityGroup = new SecurityGroup(stack, 'SecurityGroup', {
            vpc,
            description: 'Allow access to ec2 instances',
            allowAllOutbound: true,
          });
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'allow ssh access from the world');
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), "Http traffic to the webserver");
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), "Secured http traffic to the webserver"); 
        
        const webroot = '/var/www/html';

        const amznLinux = MachineImage.latestAmazonLinux({
            generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        });

        const handle = new InitServiceRestartHandle();
        const instance = new Instance(stack, "Wordpress Server", {
            instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
            machineImage: amznLinux,
            vpc: vpc,
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC,
            },
            instanceName: "Wordpress Server",
            init: CloudFormationInit.fromConfig(new InitConfig([
                InitPackage.yum('php'),
                InitService.enable("httpd", {
                    enabled: true,
                    ensureRunning: true,
                    serviceRestartHandle: handle,
                }),
                InitSource.fromGitHub(webroot, 'F3NATX', 'F3AustinWP', "mainline"),
                InitCommand.shellCommand("systemctl start httpd"),
                InitCommand.shellCommand("systemctl enable httpd"),
            ])),
            securityGroup: securityGroup,
        });

        new CfnOutput(stack, "Wordpress Server IP Address", {
            value: instance.instancePublicIp,
        })
    }
}