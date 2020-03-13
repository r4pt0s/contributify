require("dotenv").config();

const github = require("@actions/github");
const core = require("@actions/core");
const glob = require("@actions/glob");

const filename = "CONTRIBUTORS.md";
const token = core.getInput("repo-token");
const octokit = new github.GitHub(token);
const payload = github.context.payload;

console.log(JSON.stringify(github, null, 2));

try {
  //createPR();
  run(payload);
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

  main(payload.pull_request.user);
}

//! DONE !!!!!!
async function main(userLogin) {
  console.log("____________________________");

  const patterns = ["**/CONTRIBUTORS.md"];
  const globber = await glob.create(patterns.join("\n"));
  const files = await globber.glob();
  let isUserInFile = { fileExists: false };

  console.log(files);
  if (files.length > 0) {
    // file already exists
    console.log("FILE EXISTS", "CHECKING ENTRIES IF USER IS ALREADY IN....");
    console.log("=================================");
    isUserInFile = await checkIfContributorExists(userLogin.login);
    console.log(
      "========================================================================"
    );
    console.log("IS USER IN FILE: ", isUserInFile);
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
//!!!!!!!

//! DONE !!!
async function checkIfContributorExists(loginName) {
  const result = await octokit.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: `${filename}`
  });
  const fileContents = Buffer.from(result.data.content, "base64").toString();

  console.log("login name:", loginName);
  return { fileExists: fileContents.includes(loginName), sha: result.data.sha };
}
//!!!!!!!!!

async function createAndCommitFile(loginName, profileUrl, fileSha) {
  // create file, add current author of PR to newly created CONTRIBUTORS.md file
  console.log("CONTRIBUTORS FILE DOESNT EXITSTS");
  console.log("=================================");
  const payload = github.context.payload;

  try {
    console.log("current commit: ", await getCurrentCommit());

    // commit message => `CONTRIBUTIFY BOT added ${loginName} to CONTRIBUTORS.md file`
    await octokit.repos.createOrUpdateFile({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      message: `CONTRIBUTIFY BOT added ${loginName} to CONTRIBUTORS.md file`,
      content: Buffer.from(`\n- [@${loginName}](${profileUrl})`).toString(
        "base64"
      ),
      path: `${filename}`,
      sha: fileSha, //github.context.payload.pull_request.base.sha,
      branch: "master"
    });
  } catch (err) {
    console.log("NOT ABLE TO CREATE OR UPDATE THE FILE: ", err);
  }

  console.log("=================================");
  console.log("GENERATED FILE AND PUSHED IT TO MASTER RIGHT NOW");
}

const getCurrentCommit = async (branch = "master") => {
  const { data: refData } = await octokit.git.getRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `heads/${branch}`
  });
  const commitSha = refData.object.sha;
  const { data: commitData } = await octokit.git.getCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    commit_sha: commitSha
  });

  return {
    commitSha,
    treeSha: commitData.tree.sha
  };
};

const createNewCommit = async (message, currentTreeSha, currentCommitSha) =>
  (
    await octo.git.createCommit({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      message,
      tree: currentTreeSha,
      parents: [currentCommitSha]
    })
  ).data;

const setBranchToCommit = (branch = "master", commitSha) =>
  octokit.git.updateRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `heads/${branch}`,
    sha: commitSha
  });
