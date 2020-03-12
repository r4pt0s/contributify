require("dotenv").config();

//REMOVE IT MAYBE const simpleGit = require("simple-git/promise");
const fs = require("fs");
const path = require("path");
const github = require("@actions/github");
const core = require("@actions/core");
const glob = require("@actions/glob");
// REMOVE IT MAYBE const git = simpleGit();
const remote = `https://github.com/${core.getInput("workspace")}.git`;

const filename = "CONTRIBUTORS.md";
const file = path.join(__dirname, "..", filename);
const token = core.getInput("repo-token");
const octokit = new github.GitHub(process.env.GITHUB_TOKEN);
const payload = github.context.payload;

try {
  // user who made the pr
  const user = payload.sender;
  run(payload);
  //main(user);
} catch (error) {
  core.setFailed(error.message);
}

async function run(payload) {
  /* 
    this.labels = payload.pull_request.labels.map(x => x.name);
    this.owner = payload.repository.owner.login;
    this.pull_number = payload.pull_request.number;
    this.reviews = [];
    this.ref = `heads/${payload.pull_request.head.ref}`;
    this.repo = payload.repository.name;
    this.requested_reviewers = payload.pull_request.requested_reviewers;
    this.checks = {};
 */
  console.log(payload.pull_request.user);
  const { data: pullRequest } = await octokit.pulls.get({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: payload.pull_request.number
  });
  console.log("FROM NEWLY FETCHED PR, ", pullRequest.user);

  main(payload.pull_request.user);
}

async function main(userLogin) {
  console.log("____________________________");

  const patterns = ["**/CONTRIBUTORS.md"];
  const globber = await glob.create(patterns.join("\n"));
  const files = await globber.glob();
  let isUserInFile = null;

  console.log(files);
  if (files.length > 0) {
    // file already exists
    console.log("FILE EXISTS", "CHECKING ENTRIES IF USER IS ALREADY IN....");
    console.log("=================================");
    isUserInFile = await checkIfContributorExists(userLogin.login);
  }

  if (!isUserInFile.fileExists) {
    await createAndCommitFile(
      userLogin.login,
      userLogin.html_url,
      isUserInFile.sha
    );
  } else {
    console.log("=================================");
    console.log("USER IS ALREADY IN FILE....");
  }
}

async function checkIfContributorExists(loginName) {
  const result = await octokit.repos.getContents({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    path: `${filename}`
  });
  const fileContents = Buffer.from(result.data.content, "base64").toString();

  console.log("FILE CONTENTS, ", JSON.stringify(result, null, 2), fileContents);
  return { fileExists: fileContents.includes(loginName), sha: result.data.sha };
}

async function createAndCommitFile(loginName, profileUrl, fileSha) {
  // create file, add current author of PR to newly created CONTRIBUTORS.md file
  console.log("CONTRIBUTORS FILE DOESNT EXITSTS");
  console.log("=================================");
  const payload = github.context.payload;

  await octokit.repos.createOrUpdateFile({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    message: `CONTRIBUTIFY BOT added ${loginName} to CONTRIBUTORS.md file`,
    content: Buffer.from(`\n- [@${loginName}](${profileUrl})`).toString(
      "base64"
    ),
    path: `${filename}`,
    sha: fileSha,
    branch: "master",
    committer: {
      name: "CONTRIBUTIFY BOT",
      email: "no@email.com"
    }
  });

  console.log("=================================");
  console.log("GENERATED FILE AND PUSHED IT TO MASTER RIGHT NOW");
}
