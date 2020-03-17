require("dotenv").config();

const github = require("@actions/github");
const core = require("@actions/core");
const glob = require("@actions/glob");

const filename = "CONTRIBUTORS.md";
const token = core.getInput("repo-token");
const octokit = new github.GitHub(token);
const payload = github.context.payload;

console.log(JSON.stringify(github.context.repo, null, 2));

try {
  run(payload);
} catch (error) {
  core.setFailed(error.message);
}

async function run(payload) {
  if (github.context.payload.pull_request.head.ref === "contributify") {
    const delRef = await octokit.git.deleteRef({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      ref: `heads/${github.context.payload.pull_request.head.ref}`
    });
    console.log(
      "=============MERGED PR FROM CONTRIBUTIFY BOT=================="
    );
    console.log("END");
    return;
  } else {
    main(payload.pull_request.user);
  }
}

//! DONE !!!!!!
async function main(userLogin) {
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
    isUserInFile = await checkIfContributorExists(userLogin.login);
    console.log(
      "========================================================================"
    );
    console.log("IS USER IN FILE: ", isUserInFile);

    if (!isUserInFile.userExists) {
      await handelWork(userLogin, isUserInFile.fileContents);
    } else {
      console.log("=================================");
      console.log("USER IS ALREADY IN FILE....");
    }
  } else {
    // IF the file doesn't exist, create the file
    await handelWork(userLogin, "");
  }
}
//!!!!!!!

async function handelWork({ login, html_url }, prevContent) {
  try {
    await setRepo(github.context.repo.owner, github.context.repo.repo);
    await setBranch(
      github.context.repo.owner,
      github.context.repo.repo,
      "master"
    );
    await pushFiles(`CONTRIBUTIFY BOT added ${login} to CONTRIBUTORS.md file`, [
      {
        content: `${prevContent}- [@${login}](${html_url})\n`,
        path: "CONTRIBUTORS.md"
      }
    ]);
    console.log("Files committed!");
  } catch (err) {
    console.log("ERROR: ", err);
  }
}

//! DONE !!!
async function checkIfContributorExists(loginName) {
  const result = await octokit.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: `${filename}`
  });
  const fileContents = Buffer.from(result.data.content, "base64").toString();

  console.log("login name:", loginName);
  return {
    userExists: fileContents.includes(loginName),
    sha: result.data.sha,
    fileContents
  };
}
//!!!!!!!!!

let filesToCommit = [];
let currentBranch = {};
let newCommit = {};

const setRepo = async function(userName, repoName) {
  console.log("===============setRepo==================");

  return await octokit.repos.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  });
};

const setBranch = async function(owner, repo, branchName) {
  console.log("==============setBranch===================");
  currentBranch.name = "contributify";
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
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: "heads/" + currentBranch.name
  });

  console.log("=================================");
  console.log("CURRENT COMMIT SHA: ", commitSha.data.object.sha);
  console.log("=================================");

  currentBranch.commitSHA = commitSha.data.object.sha;
}

async function getCurrentTreeSHA() {
  const commit = await octokit.repos.getCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
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
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    content: file.content
  });

  filesToCommit.push({
    sha: blob.data.sha,
    path: file.path,
    mode: "100644",
    type: "blob"
  });
  /*   console.log("===============createFile-END==================");
  console.log("CREATED FILE: ", {
    sha: blob.data.sha,
    path: file.path,
    mode: "100644",
    type: "blob"
  });
  console.log("BLOB: ", blob);
  console.log("=================================");
  */
  return blob;
}

async function getRef() {
  const refAvailable = await octokit.git.getRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `heads/${currentBranch.name}`
  });

  console.log(refAvailable);
}

async function createRef(startSHA) {
  console.log("================createRef-START=================");

  const newBranch = await octokit.git.createRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: "refs/heads/contributify",
    sha: startSHA
  });

  currentBranch.treeSHA = newBranch.data.object.sha;

  console.log(newBranch.data.object);
}

async function createTree() {
  console.log("================createTree-START=================");

  const newTree = await octokit.git.createTree({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
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
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
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
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `heads/${currentBranch.name}`,
    sha: newCommit.sha,
    force: true
  });

  console.log("===============updateHead-END==================");
  console.log("UPDATE HEAD: ", JSON.stringify(newHead.data, null, 2));
  console.log("=================================");
}

async function createPR() {
  const newPR = await octokit.pulls.create({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    title: "Added new Contributor to CONTRIBUTORS.md file",
    head: `${github.context.repo.owner}:${currentBranch.name}`,
    base: "master"
  });

  console.log("===============updateHead-END==================");
  console.log("MADE A NEW PR: ", JSON.stringify(newPR, null, 2));
  console.log("=================================");
}
