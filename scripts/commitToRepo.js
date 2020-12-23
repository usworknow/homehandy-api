
if (!process.env.commit) {
  throw new Error('Missing commit message. (ex: commit="this is my commit" npm run deploy)')
}
// console.log('Commit msg: ' + process.env.commit)
require('simple-git')()
  .add('./*')
  .commit(process.env.commit)
  .push(['-u', 'origin', 'master'], function () {
    console.log()
    console.log('Successful Commit')
    console.log()
  })
