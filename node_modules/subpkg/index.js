#!/usr/bin/env node
'use strict'

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const DEPENDENCIES = ['dependencies', 'devDependencies', 'optionalDependencies'];

const args = process.argv.slice(2);
if (!args.length) return;

const root = find(process.cwd());

const run = args[0] === 'run';
let targets = args.slice(1 + run);
if (!targets.length) targets = list(root);

const bin = `${root.path}/node_modules/.bin`;
const env = {...process.env, PATH: process.env.PATH ? `${process.env.PATH}:${bin}` : bin};

if (args[0] === 'link') {
  const {subPackages, lookup} = fill(root);
  for (let target of targets) {
    const pkg = subPackages[lookup[target]];
    let nl = false;
    for (const dep of DEPENDENCIES) {
      if (pkg.json[dep]) {
        for (const name in pkg.json[dep]) {
          const internal = subPackages[name];
          if (internal) {
            if (!nl) console.log(`\x1b[96m${pkg.json.name}\x1b[0m`);
            nl = true;

            const from = `${root.path}/${pkg.path}/node_modules/${name}`;
            const to = `${root.path}/${internal.path}`;
            console.log(`\x1b[90m${name}\x1b[0m ${path.relative(process.cwd(), from)} -> ${path.relative(process.cwd(), to)}`);

            try {
              if (fs.lstatSync(from).isDirectory()) {
                fs.rmdirSync(from, {recursive: true});
              } else {
                fs.unlinkSync(from);
              }
            } catch (err) {
              if (err.code !== 'ENOENT') throw err;
            }
            if (!fs.existsSync(path.dirname(from))) {
              fs.mkdirSync(path.dirname(from), {mode: 0o755, recursive: true});
            }
            fs.symlinkSync(to, from);
          }
        }
      }
    }
    if (nl) console.log();
  }
} else if (args[0] === 'bump') {
  let version = /^\d+\.\d+\.\d+$/.test(targets[targets.length - 1]) && targets.pop();

  const {subPackages, lookup} = fill(root);
  for (const target of targets) {
    const name = lookup[target];

    const bumpPkg = subPackages[name];
    if (!bumpPkg) throw new Error(`Unknown package ${name}`);

    if (!version) {
      const [major, minor, patch] = bumpPkg.json.version.split('.');
      version = `${major}.${minor}.${Number(patch) + 1}`;
    }

    console.log(`\x1b[96m${target}\x1b[0m ${bumpPkg.json.version} -> ${version}`);
    bumpPkg.json.version = version;
    fs.writeFileSync(
      path.join(root.path, bumpPkg.path, 'package.json'),
      JSON.stringify(bumpPkg.json, null, 2) + '\n');

    let nl = false;
    for (const n in subPackages) {
      const pkg = subPackages[n];
      for (const dep of DEPENDENCIES) {
        if (pkg.json[dep] && pkg.json[dep][name]) {
          console.log(`${pkg.json.name} \x1b[90m${dep}\x1b[0m ${pkg.json[dep][name]} -> ^${version}`);
          nl = true;
          pkg.json[dep][name] = `^${version}`;
          fs.writeFileSync(
            path.join(root.path, pkg.path, 'package.json'),
            JSON.stringify(pkg.json, null, 2) + '\n');
        }
      }
    }
    if (nl) console.log();
  }
} else {
  const cmd = args[+run];
  const cmdargs = args.slice(0, 1 + run);
  if (!run && root.json.scripts && root.json.scripts[cmd]) cmdargs.unshift('run');

  const spawn = (cmd, args, cwd, env) =>  child_process.spawnSync(cmd, args, {stdio: 'inherit', shell: true, cwd, env});
  const error = (msg) => { console.error(msg); process.exit(1); };

  if (targets.length === 1) {
    const target = targets[0];
    if (!root.json.subPackages.includes(target)) error(`Unknown subPackage '${target}'`);
    const json = require(path.resolve(root.path, target, 'package.json'));
    if (run && !(json.scripts && json.scripts[cmd])) error(`'${json.name}' does not have script '${cmd}'`);

    console.log('Running\x1b[36m npm', cmdargs.join(' '), '\x1b[0mfor package \x1b[34m' + json.name + '\x1b[0m...');
    const result = spawn('npm', cmdargs, path.resolve(root.path, target), env);
    process.exit(result.status);
  } else {
    console.log('Running\x1b[36m npm', cmdargs.join(' '), '\x1b[0mfor', targets.length, 'packages...');
    for (const target of targets) {
      if (!root.json.subPackages.includes(target)) error(`Unknown subPackage '${target}'`);
      const json = require(path.resolve(root.path, target, 'package.json'));

      if (run && !(json.scripts && json.scripts[cmd])) {
        console.log('\x1b[90mSkipping package' + json.name + '...\x1b[0m');
        continue;
      }

      console.log('Package \x1b[34m' + json.name + '\x1b[0m...');
      const result = spawn('npm', cmdargs, path.resolve(root.path, target), env);
      if (result.status !== 0) process.exit(result.status);
    }
  }
}

function find(dir) {
  try {
    const pkg = path.join(dir, 'package.json');
    if (!fs.existsSync(pkg)) return find(path.dirname(dir), path.join(path.basename(dir)));
    const json = require(pkg);
    if (!json.subPackages) return find(path.dirname(dir), path.join(path.basename(dir)));
    return {path: dir, json};
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;
    if (dir === '/') throw new Error(`No 'subPackages' entry found in any package.json`);
    return find(path.dirname(dir), path.join(path.basename(dir)));
  }
}

function fill(root) {
  const subPackages = {};
  const lookup = {};
  for (const pkg of root.json.subPackages) {
    const json = require(path.join(root.path, pkg, 'package.json'));
    subPackages[json.name] = {path: pkg, json};
    lookup[pkg] = json.name;
  }
  return {subPackages, lookup};
}

function list(root) {
  if (root.json.subPackages instanceof Object && !Array.isArray(root.json.subPackages)) {
    const subPackages = []
    for (const dir in root.json.subPackages) {
      console.log(
        `Loading package list \x1b[34m${root.json.subPackages[dir]}\x1b[0m for directory \x1b[33m${dir}\x1b[0m...`);
      const pkgs = require(path.join(root.path, root.json.subPackages[dir]));
      for (const pkg in pkgs) {
        console.log(`Package \x1b[34m${pkg}\x1b[0m is \x1b[33m${pkgs[pkg] ? 'active' : 'inactive'}\x1b[0m...`);
        if (pkgs[pkg]) subPackages.push(root.path + '/' + dir + '/' + pkg);
      }
    }
    root.json.subPackages = subPackages;
  }
  return root.json.subPackages;
}
