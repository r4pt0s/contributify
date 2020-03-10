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
  const payload = JSON.stringify(github.context.payload, null, 2);
  // user who made the pr
  const user = payload.pull_request.sender;

  console.log("user who made the pr: ", user);
} catch (error) {
  core.setFailed(error.message);
}

/* async function run() {
  // This should be a token with access to your repository scoped in as a secret.
  // The YML workflow will need to set myToken with the GitHub Secret Token
  // myToken: ${{ secrets.GITHUB_TOKEN }}
  // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
  const myToken = process.env.GITHUB_TOKEN //core.getInput("GITHUB_TOKEN");

  const octokit = new github.GitHub(myToken);

  const { data: pullRequest } = await octokit.pulls.get({
    owner: process.env.GITHUB_ACTOR,
    repo: "rest.js",
   
  });

  console.log(pullRequest);
}

run(); */

async function main() {
  const status = await git.status();

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

  try {
    await git.catFile(["-s", "master:CONTRIBUTORS.md"]);
    // file already exists

    console.log(master);
  } catch (err) {
    //does not exist
    await createAndCommitFile();
  }
  //console.log(commitHistory);

  /*if (hasContri.length > 0) {
    // Do file editing and git add, git commit the changes
    //fs.writeFileSync('./')
    console.log("CONTRIBUTORS FILE EXITSTS ALREADY");
  } else {
    
  } */
}

async function createAndCommitFile() {
  // create file, add current author of PR to newly created CONTRIBUTORS.md file
  const commitHistory = await git.log();
  const { author_email, author_name } = commitHistory.all[0];
  console.log("CONTRIBUTORS FILE DOESNT EXITSTS");
  const file = path.join(__dirname, filename);

  console.log(commitHistory.all[2]);
  console.log("CURRENT COMMIT ID", process.env.GITHUB_SHA);
  console.log("AUTHOR AND MAIL: ", author_email, author_name);

  fs.writeFileSync(
    file,
    `- [@${author_name}](https://github.com/${author_name}/)`
  );
  git.addConfig("user.name", process.env.GITHUB_ACTOR);
  git.addConfig("user.email", "");
  git.add([file]);
  git.commit("committed CONTRIBUTORS.md file", [file], {
    "--author": '"CONTRIBUTIFY BOT <contri@test.com>"'
  });
  git.push(["-u", "origin", "master"], () => console.log("done"));

  //git add, git commit the changes
}

//main();
