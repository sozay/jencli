#!/usr/bin/env node
const _ = require('underscore');
require('get-form-data');
const chalk = require('chalk');
var read = require('read');
const xmlParser = require('xml2js').parseString;
const req = require('request');
const fs = require("fs");
var url = require('url');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var htmlParser = require('cheerio');
var username;
var password;
var jenkinsHost ;
var path = []
var folderType = "com.cloudbees.hudson.plugins.folder.Folder";
var workflowType = "org.jenkinsci.plugins.workflow.job.WorkflowJob";
innerUrl = "\\>";
const cheerio = require('cheerio');
const nl = (process.platform === 'win32' ? '\r\n' : '\n')
jobsIndex = {};
var jobs = [];
var lastJob = "";
var sleep = require('sleep');
//user = "admin"
//token = "da245750032f080e67bebe9e39d4bbdb";



const error = chalk.bold.red;
const warning = chalk.keyword('orange');
const info = chalk.gray;
const title = chalk.cyan;


function JobItem(parent,name,url,type){
  this.name = name;
  this.url = url;
  this.type = type;
}
function xmlApi(host) {
  return host + "/api/xml";
}

function query()
{
  read({ prompt: updateInnerUrl()},cExecuter);
}

function updateInnerUrl()
{ inner = "";
  if(path.length > 0) {
    path.forEach(function(folder){
      inner += "\\"+folder;
    });
  }else {
      inner = "\\";
  }
  return inner + ">";
}



function getPathUrl(){
  url = jenkinsHost;
  path.forEach(function(folder){
    url += "/job/"+folder;
  })
  return url;
}

function postJobForm(jobName,params,pathUrl,innerUrl,executer,callback)
{
  var options;

  postUrl = "";

  if(Object.keys(params).length > 0)
  {
    postUrl = pathUrl+"/buildWithParameters";
    options = {
      uri: postUrl,
      method: 'POST',
      headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
          'Content-Type' : 'application/x-www-form-urlencoded'
      },
      auth: {
          'user': user,
          'pass': apiToken
      },
      form: params
    };

  }else {
    postUrl = pathUrl + "/build?delay=0sec";
    options = {
      uri: postUrl,
      method: 'POST',
      headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
          'Content-Type' : 'application/x-www-form-urlencoded'
      },
      auth: {
          'user': user,
          'pass': apiToken
      }
    };

  }

  getLastBuildNumber(jobName, function(buildNumber){
    console.log(title("Build is starting.."));
    req.post(options,function(err, response, body)
      {
        if(!err){
          console.log(title("Build has been started.."));
          getNewBuildState(jobName,buildNumber,innerUrl,executer,callback);
        }else {
          console.log(error("err occured"+err));
          callback(innerUrl,executer);
        }
      });
    });
}

function getUserInput(inputs,result,next)
{
  if(inputs.length>0)
  {
    name = inputs.pop();
    text = name +" :";
    read({ prompt: text , silent: false },function(err,input)
    {
      result[name] = input;
      getUserInput(inputs,result,next);
    });
  }else {
    next(result);
  }
}

function build(jobName,innerUrl,executer,callback)
{
  lastJob = jobName;
  found = false;
  if(jobName in jobsIndex)
  {
    if(jobsIndex[jobName].type == folderType)
    {
        console.log(error("You can not run it, it is a folder :)"));
        callback(innerUrl,executer);
        return;
    }

    jobName = jobsIndex[jobName].name;
    found = true;
  }else {
    found = jobs.includes(jobName);
  }
  if(!found)
  {
    console.log(error("Job name not found"));
    callback(innerUrl,executer);
    return
  }

  pathUrl = getPathUrl() +"/job/"+jobName;
  formUrl = pathUrl + "/build";

  req(formUrl,function(err, response, body)
    {
      if(!err){
         var $ = htmlParser.load( body);
         var params = $('div[name="parameter"]');

         inputNames = [];
         for(var i=0;i<params.length;i++)
         {
           var inputs = params.find('input');

           for(var i=0;i<inputs.length;i++)
           {
             if(inputs[i].attribs["type"] == "hidden")
             {
               name = inputs[i].attribs["value"];
               inputNames.push(name);
             }
           }
         }

         var formParameters = {};
         if(inputNames.length>0)
         {
           console.log("Please enter pipeline parameters..")
           getUserInput(inputNames,{},function(res)
           {
              formParameters = res;
              postJobForm(jobName,formParameters,pathUrl,innerUrl,executer,callback)
           });
         }else {
           postJobForm(jobName,formParameters,pathUrl,innerUrl,executer,callback);
         }
      }
      else {
          console.log("error on request"+err);
      }
    });
}
function getLastBuildNumber(jobName,next)
{
  if(jobName in jobsIndex)
  {
    jobName = jobsIndex[jobName].name;
  }
  pathUrl = getPathUrl() +"/job/"+jobName;
  requrl = pathUrl + "/api/xml";

  req(requrl,function(err, response, body)
  {
      if(!err){
        xmlParser(body, function (err, result) {

          if(result.workflowJob && result.workflowJob.lastBuild)
          {
            //console.log(info(">LAST last completed build number:"+result.workflowJob.lastBuild[0].number));
            next(result.workflowJob.lastBuild[0].number);
          }else {
            console.log(info("Earlier build not found"));
            next(-1);
          }
        });
      }else {
          Console.log(info("error occured getting last build"+err.toString()));
          next(-1);;
      }
    });
}

function getLastBuildNumberApi(jobName,next)
{
  if(jobName in jobsIndex)
  {
    if(jobsIndex[jobName].type == folderType)
    {
      console.log("It is a folder mate!");
      next();
      return;
    }
    jobName = jobsIndex[jobName].name;
  }

  pathUrl = getPathUrl() +"/job/"+jobName;
  requrl = pathUrl + "/lastBuild/api/xml";

  req(requrl,function(err, response, body)
  {
      if(!err && body.includes('workflowRun')){
        xmlParser(body, function (err, result) {
          var found = false;
          //console.log(result)
          if(result.workflowRun && result.workflowRun.action)
          {
            for(var i = 0; i< result.workflowRun.action.length; i++)
            {
              //console.log(result.workflowRun.action[i].$);

              if(!!result.workflowRun.action[i].parameter)
              {
                for(var z = 0; z< result.workflowRun.action[i].parameter.length; z++)
                {
                  found =true;
                  console.log(result.workflowRun.action[i].parameter[z].name[0]+" : "+result.workflowRun.action[i].parameter[z].value[0]);
                  break;
                }
                if(found)
                {
                  break;
                }
              }
            }
            next("OK");

            //console.log(info(">LAST last completed build number:"+result.workflowJob.lastBuild[0].number));

          }else {
            console.log(info("Earlier build not found"));
            next(-1);
          }
        });
      }else {
        if(err)
        {
          console.log(info("error occured getting last build"+err.toString()));
        }else {
          console.log(info("can not find previos build"));
        }

          next(-1);;
      }
    });
}

function getConsoleText(lastLineCount, pathUrl,innerUrl,executer,next)
{
  var pathUrlConsole = pathUrl + "/lastBuild/consoleText";
  //console.log(info(">Uri:"+pathUrlConsole));
  finish = false;
  //sleep.sleep(1);
  req(pathUrlConsole,function(err, response, body)
    {
      errorInJob = false;
      if(!err){
        //console.log(info(">getting new outputs......."));
        $ = cheerio.load(body);
        //console.log(info(">Uri:"+pathUrlConsole));
        //out = $('#main-panel').text().split(nl);
        out = body.split(nl);
        if(lastLineCount == 0)
        {
          //console.log(info(">NEW BUILD NUMBER:"+result.workflowJob.lastBuild[0].number));
          //console.log(info(">PREVIOUS BUILD NUMBER:"+buildNumber));
          console.log(title("OUTPUT:"));
          console.log(title("=========================================="));
        }

        if(out.length > lastLineCount){
          if(lastLineCount>0)
            lastLineCount--;
          for(var i=lastLineCount;i<out.length;i++){
            if(out[i].indexOf("Error") > -1)
            {
              console.log(error(">"+out[i]));
            }else if(out[i].indexOf("SUCCESS") > -1)
            {
              console.log(title(""+out[i]));
            }
            else {
              console.log(info(">"+out[i]));
            }

            if(out[i].indexOf("Finished") > -1)
            {
              //
              if(out[i].indexOf("FAILURE") > -1 )
              {
                errorInJob = true;
              }
              finish = true;
            }
          }
          lastLineCount = out.length
          if(!finish)
          {
            process.stdout.write(".")
            sleep.sleep(1);
            getConsoleText(lastLineCount, pathUrl,innerUrl,executer,next)
          }else {
            next(innerUrl,executer);
          }
        }else {
          process.stdout.write(".")
          sleep.sleep(2);
          getConsoleText(lastLineCount, pathUrl,innerUrl,executer,next)
        }
      }else{
        console.log("error");
        console.log(error('there is an error occurred when getting the console'));
        next(innerUrl,executer);
      }
    });
}

function getNewBuildState(jobName,buildNumber,innerUrl,executer,callback)
{
  if(jobName in jobsIndex)
  {
    jobName = jobsIndex[jobName].name;
  }
  pathUrl = getPathUrl() +"/job/"+jobName;
  requrl = pathUrl + "/api/xml";

  req(requrl,function(err, response, body)
    {

      if(!err){
        xmlParser(body, function (err, result) {
          //console.log(JSON.stringify(result));
          console.log(title(">####################################################################################"));

          if(result.workflowJob && result.workflowJob.lastBuild)
          {
            if(buildNumber == result.workflowJob.lastBuild[0].number)
            {
              console.log(error(">No new build founded"));
              callback(innerUrl,executer);

            }else {

              var pathUrlConsole = pathUrl + "/"+result.workflowJob.lastBuild[0].number+"/console";
              getConsoleText(0, pathUrl,innerUrl,executer,callback);
            }

          }else {
                console.log(error("Buid state couldn't taken! Run 'info buildName' command to see status"));
                callback(innerUrl,executer);
          }
        });
      }
    });
}


function report(jobName,lastBuild,innerUrl,executer,callback)
{
  if(jobName in jobsIndex)
  {
    jobName = jobsIndex[jobName].name;
  }
  pathUrl = getPathUrl() +"/job/"+jobName;
  requrl = pathUrl + "/api/xml";
  //console.log(title(requrl));
  req(requrl,function(err, response, body)
    {
      if(!err){
        xmlParser(body, function (err, result) {
          //console.log(nl);
          //console.log(JSON.stringify(result));
          if(result.workflowJob && result.workflowJob.lastBuild)
          {
            console.log(title(">####################################################################################"));
            if(!lastBuild && result.workflowJob.healthReport)
            {
              console.log(info(">"+result.workflowJob.healthReport[0].description[0]));
              console.log(info(">last completed build number:"+result.workflowJob.lastBuild[0].number));
              if(result.workflowJob.lastStableBuild && result.workflowJob.lastStableBuild.length > 0)
                console.log(info(">last stable build number:"+result.workflowJob.lastStableBuild[0].number));

            }
            var pathUrlConsole = pathUrl + "/lastBuild/consoleText"; //+result.workflowJob.lastBuild[0].number+"/console";

          }

          getConsoleText(0, pathUrl,innerUrl,executer,callback);


        });
      }
    });
}

function updateJobs(callback){
  pathUrl = getPathUrl();
  requrl = pathUrl + "/api/xml";
  jobsNew =[]

  req(requrl,function(err, response, body)
    {
      if(!err){
        xmlParser(body, function (err, result) {
          //console.dir(result);
          if(result)
          {
            tempJobs = path.length == 0 ? result.hudson.job : result.folder.job;
            tempJobs.forEach(function (val, index, array) {
                jobsNew.push(new JobItem(undefined,val.name[0],val.url[0],val.$._class));
              });

              jobs = jobsNew;
              innerUrl = updateInnerUrl();
              callback()


          }
        });
      }
   });
}





function cd(folder,callback)
{
  update = false;
  if(folder == "..")
  {
    if(path.length>0)
    {
      path.pop();
      updateJobs(callback);
    }
  }else if (folder in jobsIndex)
  {
    if (jobsIndex[folder].type == folderType)
    {
      //console.log(".."+jobsIndex[folder].name);
      path.push(jobsIndex[folder].name);
      update =true;
    }else {
      console.log("No folder found with index: "+folder);
      callback();
    }
  }else
  {
    job = jobs.filter(item => item.name.toLowerCase() === folder)
    console.log(job);
    if(job && job.length > 0 && job[0].type == folderType)
    {
      path.push(folder);
      update = true;
    }else {
      console.log("No folder found");
      callback();

    }
  }
  if(update)
  {
    updateJobs(callback);
  }
  return;
}
function printJob(counter,job)
{
  try {
    if(job.type == folderType)
    {
      console.log(info(counter +") "+job.name));
    }else if(job.type == workflowType){
      console.log(info(counter +") "+job.name+".wf"));
    }else
    {
      console.log(info(counter +") "+job.name+".undefine",job.type));
    }
  } catch (e) {
    console.log(e);
  }

}

function ls(filter,next)
{

  jobsIndex = {};
  counter = 1 ;

  if(path.length != -1)
  {
    if(filter){
      var filtered = jobs.filter(job => job.name.toLowerCase().startsWith(filter));
      var len = filtered.length;

      if(filtered.length > 0)
      {
        filtered.forEach(function(job){
              jobsIndex[counter] = job;
              printJob(counter,job);
              if(counter == len)
              {
                next();
              }
              counter++;

        });
      }else {
        next();
      }

    }else
    {
      var len = jobs.length;
      console.log( jobs.length + " project found");
      if(jobs.length > 0)
      {
        jobs.forEach(function(jb){
              jobsIndex[counter] = jb;
              printJob(counter,jb);
              if(!jb || counter == len)
              {
                next();
              }
              counter++;
        });
      }else {
        next();
      }
    }
  }else {

    next();
  }
}

var cExecuter = function commandExecuter(err,commandstr)
{
  if(err)
  {
    console.log(error("err:"+err));
    process.exit();
  }

  try {
    commands = commandstr.split(" ");
    if(commands[0] == 'help')
    {
      console.log('help is coming, path:' + path );
    }else if(commands[0] == 'ls'){
      ls(commands[1] , function(){
        read({ prompt: updateInnerUrl(), silent: false},cExecuter);
      });
    }else if (commands[0] == 'exit') {
      process.exit();
    }else if(commands[0] == 'cd' && commands.length == 2){
      cd(commands[1], function()
        {
            read({ prompt: updateInnerUrl(), silent: false},cExecuter);
        } );

    }else if (commands[0] == 'info' && commands.length ==2) {
      report(commands[1].split('.wf')[0],false,updateInnerUrl(),cExecuter,query);
    }else if (commands[0] == 'last' && commands.length ==2) {
      getLastBuildNumberApi(commands[1].split('.wf')[0],query);
    }else if ((commands[0] == 'build' || commands[0] == 'run') && commands.length ==2) {
      build(commands[1].split('.wf')[0],updateInnerUrl(),cExecuter,query);
    }else if (commands[0] == 'last' && commands.length ==2) {
      report(commands[1].split('.wf')[0],true,updateInnerUrl(),cExecuter,query);
    }else {
      console.log("...");
      read({ prompt: updateInnerUrl(), silent: false},cExecuter);
    }
  } catch (e) {
      console.log("excuter err:"+e);
      read({ prompt: updateInnerUrl()},cExecuter);
  }

  //console.log("new line")

}

if(process.argv.length < 4)
{
  console.log("Please enter username and jenkins host: jencli [cNumber] [apiToken] [host]");
  process.exit();
}else {
  process.argv.forEach(function (val, index, array) {

    if(index == 2)
    {
      user = val;
    }
    else if(index == 3)
    {
      apiToken = val;
    }
    else if(index == 4)
    {
      var jenkinsUri = url.parse(val);
      jenkinsHost = jenkinsUri.protocol+"//" + user + ":" + apiToken + "@" + jenkinsUri.host;
      console.log(jenkinsHost);

      //jenkinsHost = 'https://C0254853:814d83e9cd53eac8ed3e094a33935b04@alm-jenkins.almuk.santanderuk.corp'
      //jenkinsHost = 'http://'+user+':'+token+'@localhost:49001'
    }
  });
  req(xmlApi(jenkinsHost),function(err, response, body)
  {
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      if(!err){
        xmlParser(body, function (err, result) {

          result.hudson.job.forEach(function (val, index, array) {
              var jb = new JobItem(undefined,val.name[0],val.url,val.$._class)
              var indexAr = jobs.push(jb);
            }
          );
          read({ prompt:"\\>",silent: false},cExecuter);
        });
      }else {
        console.log(error('error:', err));
        process.exit();
      }
  });

}
