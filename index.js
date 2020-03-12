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

console.log(process.env.GITHUB_WORKSPACE);

try {
  const payload = github.context.payload;
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
  const { data: pullRequest } = await octokit.pulls.get({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: payload.pull_request.number
  });

  console.log(pullRequest);
  main(payload.sender);
}

async function main(userData) {
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
  const payload = github.context.payload;

  fs.appendFileSync(file, `\n- [@${loginName}](${profileUrl})`);

  await octokit.repos.createOrUpdateFile({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    message: `CONTRIBUTIFY BOT added ${loginName} to CONTRIBUTORS.md file`,
    content: Buffer.from(`\n- [@${loginName}](${profileUrl})`).toString(
      "base64"
    ),
    path: `${filename}`,
    sha: process.env.GITHUB_SHA,
    branch: "master",
    committer: {
      name: "CONTRIBUTIFY BOT",
      email: "no@email.com"
    }
  });

  console.log("=================================");
  console.log("GENERATED FILE AND PUSHED IT TO MASTER RIGHT NOW");
}
