require("dotenv").config();

//const simpleGit = require("simple-git")(process.env.GITHUB_WORKSPACE);
const simpleGit = require("simple-git/promise");
const fs = require("fs");
const path = require("path");
//const git = simpleGit(process.env.GITHUB_WORKSPACE);
const git = simpleGit();
const github = require("@actions/github");
const core = require("@actions/core");
const glob = require("@actions/glob");
const exec = require("@actions/exec");

const filename = "CONTRIBUTORS.md";
const file = path.join(__dirname, filename);

try {
  const payload = github.context.payload;
  // user who made the pr
  const user = payload.sender;

  console.log("user who made the pr: ", user);
  main(user);
} catch (error) {
  core.setFailed(error.message);
}

async function main(userData) {
  // maybe not necassary => await exec.exec("git checkout master");
  const patterns = ["**/CONTRIBUTORS.md"];
  const globber = await glob.create(patterns.join("\n"));
  const files = await globber.glob();
  let isUserInFile = null;

  console.log(files);
  if (files.length > 0) {
    // file already exists
    isUserInFile = checkIfContributorExists(userData.login);

    console.log("FILE EXISTS", "CHECKING ENTRIES IF USER IS ALREADY IN....");
  }

  if (!isUserInFile) {
    await createAndCommitFile(userData.login, userData.html_url);
  }
}

async function checkIfContributorExists(loginName) {
  const fileContents = fs.readFileSync(file, "utf-8");
  console.log(fileContents);

  return fileContents.includes(loginName);
}

async function createAndCommitFile(loginName, profileUrl) {
  // create file, add current author of PR to newly created CONTRIBUTORS.md file
  console.log("CONTRIBUTORS FILE DOESNT EXITSTS");

  fs.appendFileSync(file, `\n- [@${loginName}](${profileUrl})`);

  //git add, git commit the changes
  git.addConfig("user.name", process.env.GITHUB_ACTOR);
  git.addConfig("user.email", "");
  git.add([file]);
  git.commit(`added ${loginName} to ${filename}`, [file], {
    "--author": '"CONTRIBUTIFY BOT <contri@test.com>"'
  });
  git.push(["-u", "origin", "master"], () => console.log("done"));
}
