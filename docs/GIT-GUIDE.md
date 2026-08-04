# FoundIt — Git Guide (from scratch)

## 1. The mental model: code lives in four places

This is the one thing to understand. Everything else follows from it.

```
Working directory  →  Staging area  →  Local repo  →  Remote (GitHub)
   (your files)        (git add)        (git commit)     (git push)
        ↑ ______________________ git pull ______________________ |
```

- **Working directory** — the actual files on your laptop. When you edit `App.jsx`, you change this.
- **Staging area** — a holding tray. You pick *which* changes go into the next commit with `git add`. (This is the bit push/pull hides from you.)
- **Local repo** — your own complete copy of the history. `git commit` saves the staged changes here as a permanent snapshot. This is on *your* machine, nobody else sees it yet.
- **Remote** — the shared copy on GitHub. `git push` sends your commits up; `git pull` brings teammates' commits down.

A **commit** is a saved snapshot with a message. Think of it as a save point in a game — you can always come back to one.

Why staging exists: it lets you edit ten files but commit only three of them as one clean, logical change. You'll appreciate it later.

## 2. The five commands you'll use every day

```bash
git status          # what's changed / what's staged — run this constantly
git add <file>      # stage a file for the next commit  (git add . = stage everything)
git commit -m "msg" # save staged changes as a snapshot (local only)
git push            # send your commits up to GitHub
git pull            # bring teammates' commits down from GitHub
```

`git status` is your best friend. When you're lost, run it. It tells you what branch you're on, what's changed, and what's staged.

`git log --oneline` shows the history as a list of commits — run it to see what happened.

## 3. Your daily loop (copy-paste this workflow)

This is 95% of what you do. On FoundIt, `main` is protected — **you never commit directly to it.** You work on a branch, then open a Pull Request.

**Start of a work session — get up to date, then branch off:**

```bash
git checkout main               # switch to the main branch
git pull                        # get everyone's latest work
git checkout -b feat/lostfound-matching   # create + switch to YOUR branch
```

Branch names use your lane: `feat/auth-rbac`, `feat/marketplace-search`, `feat/chat`, etc.

**While working — commit small and often:**

```bash
# ... edit files ...
git status                      # see what changed
git add .                       # stage your changes
git commit -m "add keyword overlap score to matching"
```

Commit every time you finish a small, working piece. Small commits are easier to review and easier to undo. A commit message says *what changed*, in the present tense: `fix claim status not updating`, not `stuff` or `final final v2`.

**Push your branch to GitHub:**

```bash
git push -u origin feat/lostfound-matching   # first push of a new branch
git push                                      # every push after that
```

**When the feature's done — open a Pull Request** (section 6).

**Golden rule:** before you start something new, `git checkout main && git pull` again. Pulling often means small, easy merges instead of one giant painful one.

## 4. Branches, properly

A branch is just a parallel line of work. `main` is the real, working app. Your feature branch is a sandbox where you can break things without affecting anyone. When your work is good, it gets merged back into `main` through a PR.

Why four of you need this: if everyone commits to `main` directly, you constantly overwrite each other and `main` is always half-broken. Branches let all four of you build at once, and `main` only ever receives *finished, reviewed* work.

```bash
git branch                      # list branches, * marks the one you're on
git checkout main               # switch branches
git checkout -b feat/new-thing  # create a new branch and switch to it
git branch -d feat/old-thing    # delete a branch after it's merged
```

You can have your branch and switch away to `main` and back freely — your uncommitted work stays with the files, so commit before switching to avoid confusion.

## 5. Merge conflicts — don't panic

A conflict happens when two people change **the same lines of the same file** and Git can't decide which version wins. It is *normal*, not a disaster. Git just needs you to choose.

You'll usually hit it on `git pull` or when merging a PR. Git marks the clash inside the file like this:

```
<<<<<<< HEAD
const score = keywordOverlap * 2;      // your version
=======
const score = keywordOverlap * 1.5;    // their version
>>>>>>> main
```

To resolve it:

1. Open the file. Find the `<<<<<<<`, `=======`, `>>>>>>>` markers.
2. Delete the markers and edit the code so it's the *correct final version* — maybe yours, maybe theirs, maybe a blend. You decide.
3. Save, then:

```bash
git add <the-file>
git commit          # finishes the merge (Git pre-fills a message, just save)
```

If it goes wrong and you want to bail out and try again:

```bash
git merge --abort   # cancels the merge, back to before you pulled
```

**How to avoid most conflicts:** pull often, keep commits small, and — as agreed in the team guide — **announce in the group chat before editing shared files** (`types.ts`, security rules, Tailwind config). Those are the files two people edit at once.

## 6. Pull Requests (the GitHub side)

A PR is how your branch gets reviewed and merged into `main`. On GitHub:

1. Push your branch. GitHub shows a **"Compare & pull request"** button — click it.
2. Give it a clear title and a one-line description of what it does.
3. Request a review — Nidhi (lead) or whoever owns the adjacent module.
4. The reviewer reads it, comments, approves.
5. Click **Merge**, then delete the branch.

Keep PRs **small**. A 200-line PR gets reviewed properly; a 2000-line one gets rubber-stamped, which defeats the point. If your reviewer can't understand it, it's too big.

## 7. `.gitignore` and secrets

Some files must **never** go into Git: your `.env` (Firebase keys), `node_modules/`, build output. A `.gitignore` file tells Git to skip them.

Create `.gitignore` at the repo root on commit #1 — before there's ever a key to leak:

```
# .gitignore
node_modules/
dist/
.env
.env.local
*.log
.firebase/
```

**If you ever accidentally commit a secret:** removing it in a later commit is *not enough* — it's still in the history. Treat the key as compromised: **rotate/revoke it** in the Firebase console, then clean the history (ask Nidhi — it needs a force-push and everyone re-cloning). Rotating the key is the part that actually protects you; the history cleanup is secondary.

## 8. The "oh no" recovery kit

Beginners panic and make it worse. Here's the calm version. **Almost nothing in Git is truly lost** — commits are recoverable.

```bash
# I edited a file and want to throw away my un-committed changes:
git restore <file>

# I staged something by mistake (added it), want to un-stage (keep the edit):
git restore --staged <file>

# I want to save my messy work aside, do something else, come back to it:
git stash                    # tucks changes away, gives you a clean working dir
git stash pop                # brings them back

# My last commit message was wrong (and I haven't pushed yet):
git commit --amend -m "better message"

# I want to undo my last commit but KEEP the code changes:
git reset --soft HEAD~1

# I committed something broken that's ALREADY pushed — safest fix:
git revert <commit-hash>     # makes a new commit that undoes the bad one
```

Rule of thumb: `revert` for anything already pushed (it's safe for the team), `reset` only for local commits nobody has seen. When in doubt, `git stash` your work and ask Nidhi before running anything with `reset --hard` — that one *can* delete work.

## 9. Error messages, translated

| Message | Means | Fix |
|---|---|---|
| `Updates were rejected... non-fast-forward` | Someone pushed before you | `git pull`, resolve any conflict, then `git push` |
| `You have divergent branches` | Your branch and remote both have new commits | `git pull` to merge them |
| `Please commit your changes or stash them` | You're switching branches with unsaved edits | `git commit` or `git stash` first |
| `detached HEAD` | You checked out a commit instead of a branch | `git checkout main` to get back |
| `fatal: not a git repository` | You're in the wrong folder | `cd` into the project folder |

## 10. Golden rules for the team

1. **Never commit to `main`.** Branch → PR → merge.
2. **Pull before you start, pull often.** Small merges beat one huge one.
3. **Commit small, with real messages.**
4. **Announce before editing shared files** (`types.ts`, rules, Tailwind config).
5. **No secrets in Git.** `.gitignore` the `.env` on day one.
6. **Weekly merge day** (from the team guide): everyone merges, run the app together, fix breaks.
7. **When stuck, `git status` first, then ask** — don't `reset --hard` in a panic.

## One-page cheat sheet

```bash
# start work
git checkout main && git pull
git checkout -b feat/my-thing

# while working
git status
git add .
git commit -m "clear message"

# share it
git push -u origin feat/my-thing   # first time
git push                           # after that
# → open Pull Request on GitHub

# conflict during pull
#   edit the <<<<<<< ======= >>>>>>> markers, then:
git add . && git commit

# undo un-committed changes
git restore <file>

# save work temporarily
git stash / git stash pop

# undo a pushed commit (safe)
git revert <hash>
```
