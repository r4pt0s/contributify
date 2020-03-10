require("dotenv").config();

//const simpleGit = require("simple-git")(process.env.GITHUB_WORKSPACE);
const simpleGit = require("simple-git/promise");
const fs = require("fs");
const path = require("path");
//const git = simpleGit(process.env.GITHUB_WORKSPACE);
const git = simpleGit();
const github = require("@actions/github");
const core = require("@actions/core");

const filename = "CONTRIBUTORS.md";

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
  try {
    await git.catFile(["-s", "master:CONTRIBUTORS.md"]);
    // file already exists

    console.log(master);
  } catch (err) {
    //does not exist
    await createAndCommitFile(userData.login, userData.html_url);
  }
  //console.log(commitHistory);

  /*if (hasContri.length > 0) {
    // Do file editing and git add, git commit the changes
    //fs.writeFileSync('./')
    console.log("CONTRIBUTORS FILE EXITSTS ALREADY");
  } else {
    
  } */
}

async function createAndCommitFile(loginName, profileUrl) {
  // create file, add current author of PR to newly created CONTRIBUTORS.md file
  console.log("CONTRIBUTORS FILE DOESNT EXITSTS");
  const file = path.join(__dirname, filename);

  fs.writeFileSync(file, `- [@${loginName}](${profileUrl})`);

  //git add, git commit the changes
  git.addConfig("user.name", process.env.GITHUB_ACTOR);
  git.addConfig("user.email", "");
  git.add([file]);
  git.commit("committed new CONTRIBUTORS.md file", [file], {
    "--author": '"CONTRIBUTIFY BOT <contri@test.com>"'
  });
  git.push(["-u", "origin", "master"], () => console.log("done"));
}
