import { CfnOutput, Fn, Stack } from '@aws-cdk/core';
import {
    CloudFormationInit,
    InitCommand,
    InitConfig,
    InitPackage,
    Instance,
    InstanceClass,
    InstanceSize,
    InstanceType,
    MachineImage,
    SecurityGroup,
    Vpc,
    SubnetType,
    AmazonLinuxGeneration,
    InitServiceRestartHandle,
    InitService,
    InitFile,
} from '@aws-cdk/aws-ec2';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Db } from '../database/db';

export class Webserver {
    constructor(stack: Stack, vpc: Vpc, sg: SecurityGroup, db: Db) {
        const webroot = '/var/www/html';
        const githubSshKeyPath = '/home/ec2-user/github_rsa';

        const amznLinux = MachineImage.latestAmazonLinux({
            generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        });

        const ec2SsmManagementPolicy = ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore');

        const handle = new InitServiceRestartHandle();
        const instance = new Instance(stack, 'Wordpress Server', {
            instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
            initOptions: {
                printLog: true,
                ignoreFailures: true,
            },
            machineImage: amznLinux,
            vpc: vpc,
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC,
            },
            instanceName: 'Wordpress Server',
            init: CloudFormationInit.fromConfig(
                new InitConfig([
                    // Wordpress dependencies
                    InitPackage.yum('php'),
                    InitPackage.yum('php-mysql'),
                    InitCommand.shellCommand('amazon-linux-extras install -y php7.3'),
                    // Start the webserver on the host
                    InitService.enable('httpd', {
                        enabled: true,
                        ensureRunning: true,
                        serviceRestartHandle: handle,
                    }),

                    // For synchronizing the deployed site with updates releases in github.
                    InitCommand.shellCommand('yum install mysql -y'),
                    // Utility used by VersionPress system
                    InitCommand.shellCommand('yum install php-mbstring -y'),
                    InitCommand.shellCommand('yum install php-gd -y'),

                    // For synchronizing the deployed site with updates releases in github.
                    InitPackage.yum('git'),

                    InitFile.fromString('/home/ec2-user/install.sh', `

                    if [ -f "${githubSshKeyPath}" ]; then
                        echo "Generating SSH Key for github"
                        ssh-keygen -t rsa -b 4096 -C peternied@hotmail.com -f ${githubSshKeyPath} -q -N ""
                        cat ${githubSshKeyPath}.pub
                        echo "Copy and past output in new deploy key https://github.com/F3NATX/F3AustinWP/settings/keys then press enter 3 times"
                        read
                        read
                        read
                    else
                        echo "SSH Key for github already found"
                    fi

                    if [ ! -d "/var/www/html/.git" ]; then
                       echo "Downloading Wordpress Base Site"
                       rm /var/www/html
                       git clone git@github.com:F3NATX/F3AustinWP.git ${webroot} -b www3
                    fi

                    cd ${webroot}

                    echo "Updating database names in wordpress configuration"
                    ${Fn.sub('perl -pi -e "s/database_name_here/${dbname}/g" wp-config.php', { dbname: db.dbName })}
                    ${Fn.sub('perl -pi -e "s/username_here/${dbuser}/g" wp-config.php', { dbuser: db.mysqlUser })}
                    ${Fn.sub('perl -pi -e "s/password_here/${dbpass}/g" wp-config.php', { dbpass: db.mysqlPassword })}
                    ${Fn.sub('perl -pi -e "s/localhost/${dbendpoint}/g" wp-config.php', { dbendpoint: db.hostname })}

                    echo "Regenerate wordpress site salt"
                    perl -i -pe'
                    BEGIN {
                        @chars = ("a" .. "z", "A" .. "Z", 0 .. 9);
                        push @chars, split //, "!@#$%^&*()-_ []{}<>~\`+=,.;:/?|";
                        sub salt { join "", map $chars[ rand @chars ], 1 .. 64 }
                        }
                        s/put your unique phrase here/salt()/ge
                    ' wp-config.php

                    echo "Clean up permissions and ownership"
                    mkdir -p wp-content/uploads
                    chmod 755 -R /var/www/html
                    chown -R apache ${webroot}

                    echo "Open up http access"
                    cd /etc/httpd/conf/
                    perl -pi -e "s/AllowOverride All/AllowOverride None/g" httpd.conf

                    echo "Starting httpd service"
                    systemctl start httpd
                    systemctl enable httpd

                    if [ ! -f '/usr/bin/wp' ]; then
                        echo "Install WP command line utility"
                        curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
                        php wp-cli.phar --info
                        chmod +x wp-cli.phar
                        mv wp-cli.phar /usr/bin/wp
                    fi

                    echo "Verify website is opertional"
                    echo "New Wordpress site IP Address $(curl http://169.254.169.254/latest/meta-data/public-ipv4 -s)"

                    `),
                ])
            ),
            securityGroup: sg,
        });

        instance.role.addManagedPolicy(ec2SsmManagementPolicy);

        new CfnOutput(stack, 'Wordpress Server IP Address', {
            value: instance.instancePublicIp,
        });
    }
}
