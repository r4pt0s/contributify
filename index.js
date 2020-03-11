require("dotenv").config();

const simpleGit = require("simple-git/promise");
const fs = require("fs");
const path = require("path");
const github = require("@actions/github");
const core = require("@actions/core");
const glob = require("@actions/glob");
const git = simpleGit(core.getInput("workspace"));

const filename = "CONTRIBUTORS.md";
const file = path.join(__dirname, filename);

console.log(core.getInput("workspace"));

try {
  const payload = github.context.payload;
  // user who made the pr
  const user = payload.sender;
  main(user);
} catch (error) {
  core.setFailed(error.message);
}

async function main(userData) {
  const patterns = ["**/CONTRIBUTORS.md"];
  const globber = await glob.create(patterns.join("\n"));
  const files = await globber.glob();
  let isUserInFile = null;

  console.log(files);
  if (files.length > 0) {
    // file already exists
    console.log("FILE EXISTS", "CHECKING ENTRIES IF USER IS ALREADY IN....");
    console.log("=================================");
    isUserInFile = checkIfContributorExists(userData.login);
  }

  if (!isUserInFile) {
    await createAndCommitFile(userData.login, userData.html_url);
  } else {
    console.log("=================================");
    console.log("USER IS ALREADY IN FILE....");
  }
}

async function checkIfContributorExists(loginName) {
  const fileContents = fs.readFileSync(file, "utf-8");

  return fileContents.includes(loginName);
}

async function createAndCommitFile(loginName, profileUrl) {
  // create file, add current author of PR to newly created CONTRIBUTORS.md file
  console.log("CONTRIBUTORS FILE DOESNT EXITSTS");
  console.log("=================================");
  console.log(git.status());

  fs.appendFileSync(file, `\n- [@${loginName}](${profileUrl})`);

  //git add, git commit the changes
  git.addConfig("user.name", process.env.GITHUB_ACTOR);
  git.addConfig("user.email", "");
  git.add([file]);
  git.commit(`added ${loginName} to ${filename}`, [file], {
    "--author": '"CONTRIBUTIFY BOT <contri@test.com>"'
  });

  git.push(["-u", "origin", "master"], () => console.log("done"));
  console.log("=================================");
  console.log("GENERATED FILE AND PUSHED IT TO MASTER RIGHT NOW");
}
