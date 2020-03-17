require("dotenv").config();

const github = require("@actions/github");
const core = require("@actions/core");
const glob = require("@actions/glob");

const filename = "CONTRIBUTORS.md";
const token = core.getInput("repo-token");
const octokit = new github.GitHub(token);
const payload = github.context.payload;

//! console.log(JSON.stringify(github, null, 2));

try {
  //createPR();
  core.debug("STARTING PROCEDURE.....");
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

  //! console.log(payload.pull_request.user);

  main(payload.pull_request.user);
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
      /*  await createAndCommitFile(
      userLogin.login,
      userLogin.html_url,
      isUserInFile.sha
    ); */
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
        content: `${prevContent}\n- [@${login}](${html_url})`,
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

async function createAndCommitFile(loginName, profileUrl, fileSha) {
  // create file, add current author of PR to newly created CONTRIBUTORS.md file
  console.log("CONTRIBUTORS FILE DOESNT EXITSTS");
  console.log("=================================");
  const payload = github.context.payload;

  try {
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

let repo;
let filesToCommit = [];
let currentBranch = {};
let newCommit = {};

const setRepo = async function(userName, repoName) {
  //repo = octokit.getRepo(userName, repoName);
  console.log("===============setRepo==================");

  return await octokit.repos.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  });
};

const setBranch = async function(owner, repo, branchName) {
  const branches = await octokit.repos.listBranches({ owner, repo });
  currentBranch.name = "contributify";
  //await getRef();

  await createRef(github.context.payload.pull_request.base.sha);
  //currentBranch.name = branchName;

  console.log("==============setBranch===================");

  /* return repo.listBranches().then(branches => {
    let branchExists = branches.data.find(branch => branch.name === branchName);
    if (!branchExists) {
      return repo.createBranch("master", branchName).then(() => {
        currentBranch.name = branchName;
      });
    } else {
      currentBranch.name = branchName;
    }
  }); */
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

  /*  return repo.getRef("heads/" + currentBranch.name).then(ref => {
    currentBranch.commitSHA = ref.data.object.sha;
  }); */
}

async function getCurrentTreeSHA() {
  const commit = await octokit.repos.getCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `refs/head/${currentBranch.name}` //currentBranch.commitSHA
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

  /*  return repo.getCommit(currentBranch.commitSHA).then(commit => {
    currentBranch.treeSHA = commit.data.tree.sha;
  }); */
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
  console.log("===============createFile-START==================");

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
  console.log("===============createFile-END==================");
  console.log("CREATED FILE: ", {
    sha: blob.data.sha,
    path: file.path,
    mode: "100644",
    type: "blob"
  });
  console.log("BLOB: ", blob);
  console.log("=================================");
  return blob;

  /* return repo.createBlob(file.content).then(blob => {
    filesToCommit.push({
      sha: blob.data.sha,
      path: fileInfo.path,
      mode: "100644",
      type: "blob"
    });
  }); */
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

  /* return repo.createTree(filesToCommit, currentBranch.treeSHA).then(tree => {
    newCommit.treeSHA = tree.data.sha;
  }); */
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

  /* return repo
    .commit(currentBranch.commitSHA, newCommit.treeSHA, message)
    .then(commit => {
      newCommit.sha = commit.data.sha;
    }); */
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

/* 
//! DONE !!!
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
// !!!!!!!!!!

const createNewCommit = async (message, currentTreeSha, currentCommitSha) =>
  (
    await octokit.git.createCommit({
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
 */
