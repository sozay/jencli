# JENCLI

**jencli** is a command line tool for jenkins.  You can start your builds and see jobs status with using command line.


## Usage

To start it:

    $ jencli [username] [apiToken] [host]

**apiToken**
You can find api token under https://jenkinsUrl/user/XXXXX/configure for each jenkins server. Since apiToken doesn't change, it is recommended to create sh or bat files for each jenkins to use jencli.

**host**
target Jenkins Url

## Commands
**L**ist the jobs on the current folder

    $ ls

**L**ist the jobs starts with xx

    $ ls xx

**G**o into a jenkins folder

	$ cd folderName
or you can use folder number rather than folder name. The folder number can be seen when you call *ls* command

    $ cd folderNumber

**G**et last executed job's parameter 

        $ last jobFullname or jobNumber

**R**un a jenkins job.

you can run the jobs which is listed with .*w*f extension. If the job needs parameters, it will be asked after run command.

    $ run jobFullname or jobNumber

**G**et console output of last build

    $ info jobName or jobNumber

If the job is still running you will get live output of the job



## Installation

To use it, first you have to install nodejs on your machine. After it, download and then, go in code re directory.The following command is going to install in your machine.

    $ npm install -g


If you need, do not forget to set your proxy for nodejs

    npm config set proxy 'http://username:xxxx@yourproxyaddress.com'
    npm config set https-proxy 'https://username:xxxx@yourproxyaddress.com'
