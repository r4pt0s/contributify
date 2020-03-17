require("dotenv").config();

const github = require("@actions/github");
const core = require("@actions/core");
const glob = require("@actions/glob");

const filename = "CONTRIBUTORS.md";
const token = core.getInput("repo-token");
const octokit = new github.GitHub(token);
const { payload } = github.context;

const { owner, repo } = github.context.repo;
const branchName = "contributify";
const prHeadRef = github.context.payload.pull_request.head.ref;
const userToAdd = {
  name: payload.login,
  htmlUrl: payload.html_url
};

try {
  run(payload);
} catch (error) {
  core.setFailed(error.message);
}

async function run(payload) {
  if (prHeadRef === "contributify") {
    const delRef = await octokit.git.deleteRef({
      owner,
      repo,
      ref: `heads/${prHeadRef}`
    });
    console.log(
      "=============MERGED PR FROM CONTRIBUTIFY BOT=================="
    );
    console.log("END");
    return;
  } else {
    checkContributorsFile(userToAdd);
  }
}

//! DONE !!!!!!
async function checkContributorsFile({ name, htmlUrl }) {
  console.log("____________________________");

  const patterns = ["**/CONTRIBUTORS.md"];
  const globber = await glob.create(patterns.join("\n"));
  const files = await globber.glob();
  let isUserInFile = { userExists: false };

  console.log(files);

  if (files.length > 0) {
    // file already exists
    console.log("FILE EXISTS", "CHECKING ENTRIES IF USER IS ALREADY IN....");
    // console.log("=================================");
    isUserInFile = await checkIfContributorExists(name);
    console.log(
      "========================================================================"
    );
    console.log("IS USER IN FILE: ", isUserInFile);

    if (!isUserInFile.userExists) {
      await handelWork(isUserInFile.fileContents);
    } else {
      console.log("=================================");
      console.log("USER IS ALREADY IN FILE....");
    }
  } else {
    // IF the file doesn't exist, create the file
    await handelWork("");
  }
}
//!!!!!!!

async function handelWork(prevContent) {
  try {
    //await setRepo(owner, repo);
    await setAndCreateBranch();
    await pushFiles(
      `CONTRIBUTIFY BOT added ${userToAdd.name} to CONTRIBUTORS.md file`,
      [
        {
          content: `${prevContent}- [@${userToAdd.name}](${userToAdd.htmlUrl})\n`,
          path: "CONTRIBUTORS.md"
        }
      ]
    );
    console.log("Files committed!");
  } catch (err) {
    console.log("ERROR: ", err);
  }
}

//! DONE !!!
async function checkIfContributorExists(userName) {
  const result = await octokit.repos.getContents({
    owner,
    repo,
    path: `${filename}`
  });
  const fileContents = Buffer.from(result.data.content, "base64").toString();

  console.log("User to add:", userName);
  return {
    userExists: fileContents.includes(userName),
    sha: result.data.sha,
    fileContents
  };
}
//!!!!!!!!!

let filesToCommit = [];
let currentBranch = {};
let newCommit = {};

/* const setRepo = async function(userName, repoName) {
  console.log("===============setRepo==================");

  return await octokit.repos.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  });
}; */

const setAndCreateBranch = async function() {
  console.log("==============setBranch===================");
  currentBranch.name = branchName;
  await createRef(github.context.payload.pull_request.base.sha);
};

const pushFiles = function(message, files) {
  return getCurrentCommitSHA()
    .then(getCurrentTreeSHA)
    .then(() => createFiles(files))
    .then(createTree)
    .then(() => createCommit(message))
    .then(updateHead)
    .then(createPR)
    .catch(e => {
      console.error(e);
    });
};

async function getCurrentCommitSHA() {
  const commitSha = await octokit.git.getRef({
    owner,
    repo,
    ref: "heads/" + currentBranch.name
  });

  console.log("=================================");
  console.log("CURRENT COMMIT SHA: ", commitSha.data.object.sha);
  console.log("=================================");

  currentBranch.commitSHA = commitSha.data.object.sha;
}

async function getCurrentTreeSHA() {
  const commit = await octokit.repos.getCommit({
    owner,
    repo,
    ref: `refs/head/${currentBranch.name}`
  });

  console.log("===============getCurrentTreeSHA==================");
  console.log("CURRENT TREE Parents: ", commit.data.parents);
  console.log("CURRENT TREE SHA: ", commit.data.sha);
  console.log("=================================");

  currentBranch.treeSHA = commit.data.sha;

  currentBranch.parents = [
    currentBranch.commitSHA,
    commit.data.sha,
    ...commit.data.parents.map(commits => commits.sha)
  ];
}

async function createFiles(files) {
  let createdFiles = [];
  let length = files.length;

  for (let i = 0; i < length; i++) {
    const newFile = await createFile(files[i]);
    console.log("===============createFiles==================");
    console.log("CURRENT TREE Parents: ", newFile);
    console.log("=================================");
    createdFiles.push(newFile);
  }

  return createdFiles;
}

async function createFile(file) {
  console.log("===============createFile==================");

  const blob = await octokit.git.createBlob({
    owner,
    repo,
    content: file.content
  });

  filesToCommit.push({
    sha: blob.data.sha,
    path: file.path,
    mode: "100644",
    type: "blob"
  });

  return blob;
}

async function createRef(startSHA) {
  console.log("================createRef-START=================");

  const newBranch = await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${currentBranch.name}`,
    sha: startSHA
  });

  currentBranch.treeSHA = newBranch.data.object.sha;
}

async function createTree() {
  console.log("================createTree-START=================");

  const newTree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: currentBranch.treeSHA,
    tree: filesToCommit
  });

  console.log("===============createTree-END==================");
  console.log("CREATED NEW TREE: ", newTree.data.tree);
  console.log("CREATED NEW SHA: ", newTree.data.sha);
  console.log("=================================");

  newCommit.treeSHA = newTree.data.sha;
}

async function createCommit(message) {
  console.log("===============createCommit-START==================");

  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newCommit.treeSHA,
    parents: [currentBranch.treeSHA]
  });

  console.log("===============createCommit-END==================");
  console.log("CREATED NEW COMMIT, sha: ", commit.data.sha);
  console.log("=================================");

  newCommit.sha = commit.data.sha;
}

async function updateHead() {
  console.log("===============updateHead-START==================");

  const newHead = await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${currentBranch.name}`,
    sha: newCommit.sha,
    force: true
  });

  console.log("===============updateHead-END==================");
}

async function createPR() {
  const newPR = await octokit.pulls.create({
    owner,
    repo,
    title: "Added new Contributor to CONTRIBUTORS.md file",
    body: `Automated Pull Request from Contributify Action. 
            After merging the pull request, contributify branch will get deleted automatically`,
    head: `${owner}:${currentBranch.name}`,
    base: "master"
  });

  console.log("===============updateHead-END==================");
}
