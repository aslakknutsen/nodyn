var system = process.context.fileSystem();
var nodyn  = require('nodyn');
var util   = require('util');
var Stream = require('stream');

var FS = {};

// TODO: implement these functions
FS.realpath      = nodyn.notImplemented("realpath", true);
FS.realpathSync  = nodyn.notImplemented("realpathSync", true);
FS.utimes        = nodyn.notImplemented("utimes");
FS.utimesSync    = nodyn.notImplemented("utimesSync");
FS.futimes       = nodyn.notImplemented("futimes");
FS.futimesSync   = nodyn.notImplemented("futimesSync");
FS.write         = nodyn.notImplemented("write");
FS.writeSync     = nodyn.notImplemented("writeSync");
FS.readSync      = nodyn.notImplemented("readSync");
FS.appendFile    = nodyn.notImplemented("appendFile");
FS.appendFileSync= nodyn.notImplemented("appendFileSync");
FS.watchFile     = nodyn.notImplemented("watchFile");
FS.unwatchFile   = nodyn.notImplemented("unwatchFile");
FS.watch         = nodyn.notImplemented("watch");

// When vertx file system functions mirror node file system
// functions, we can use this high-order function to
// delegate. It passes args unmolested into the vertx
// API, and provides a possibly converted return value
// (or callback arg). If the type/order of function
// arguments don't match up between vertx and node, then
// don't use this function.
function delegateFunction(f, converter) {
  return function() {
    if (!converter) { converter = function(result) { return result; }; }
    var args = Array.prototype.slice.call(arguments);
    var last = args[args.length - 1];
    if (typeof last === 'function') {
        args[args.length - 1] = nodyn.vertxHandler(last, converter);
    }
    return converter(f.apply(system, args));
  };
}

FS.truncate      = delegateFunction(system.truncate);
FS.truncateSync  = delegateFunction(system.truncateSync);
FS.ftruncate     = delegateFunction(system.truncate);
FS.ftruncateSync = delegateFunction(system.truncateSync);
FS.rename        = delegateFunction(system.move);
FS.renameSync    = delegateFunction(system.moveSync);
FS.readdir       = delegateFunction(system.readDir, nodyn.arrayConverter);
FS.readdirSync   = delegateFunction(system.readDirSync, nodyn.arrayConverter);
FS.chown         = delegateFunction(system.chown);
FS.fchown        = delegateFunction(system.chown);
FS.lchown        = delegateFunction(system.chown);
FS.chownSync     = delegateFunction(system.chownSync);
FS.fchownSync    = delegateFunction(system.chownSync);
FS.lchownSync    = delegateFunction(system.chownSync);
FS.readlink      = delegateFunction(system.readSymlink);
FS.readlinkSync  = delegateFunction(system.readSymlinkSync);
FS.unlink        = delegateFunction(system.unlink);
FS.unlinkSync    = delegateFunction(system.unlinkSync);
FS.rmdir         = delegateFunction(system.delete);
FS.rmdirSync     = delegateFunction(system.deleteSync);
FS.stat          = delegateFunction(system.props,      function(result) { return new Stat(result); } );
FS.statSync      = delegateFunction(system.propsSync,  function(result) { return new Stat(result); } );
FS.lstat         = delegateFunction(system.lprops,     function(result) { return new Stat(result); } );
FS.lstatSync     = delegateFunction(system.lpropsSync, function(result) { return new Stat(result); } );

FS.exists = function(path, callback) {
  system.exists(path, function(future) {
    callback(future.result());
  });
};

FS.existsSync = function(path) {
  return system.existsSync(path);
};

FS.read = function(fd, buffer, offset, length, position, callback) {
  // fd is a vertx AsyncFile
  fd.read(buffer.delegate, offset, position, length, nodyn.vertxHandler(function(err, buf) {
    callback(err, length, buf);
  }));
};

FS.readFile = function(path) { // [options], callback
  var args = Array.prototype.slice.call(arguments, 1);
  var func = args.pop();
  var opts = args.pop();
  if ((typeof opts) === 'string') {
    opts = { encoding: opts };
  }
  system.readFile(path, nodyn.vertxHandler(function(err, buff) {
    if (opts && opts.encoding) {
      func(err, buff.toString(opts.encoding));
    } else {
      func(err, new Buffer(buff));
    }
  }));
};

FS.readFileSync = function(path, options) {
  var jBuffer = system.readFileSync(path);
  if ((typeof options) === 'string') {
    options = { encoding: options };
  }
  if (options && options.encoding) {
    return jBuffer.toString(options.encoding);
  }
  return new Buffer(jBuffer);
};

FS.fsync = function(fd, callback) {
  fd.flush(nodyn.vertxHandler(callback));
};

FS.fsyncSync = function(fd) {
  fd.flush();
};

FS.close = function(fd, callback) {
  if (!fd) return callback(new Error("Don't know how to close " + fd));
  fd.close(nodyn.vertxHandler(callback));
};

FS.closeSync = function(fd) {
  if (!fd) return new Error("Don't know how to close " + fd);
  fd.close();
};

FS.open = function(path, flags) {
  var args = Array.prototype.slice.call(arguments, 2);
  var func = args.pop();
  var mode = args.pop();
  var flag = mapOpenFlags(flags);
  system.open(path, convertModeToString(mode), flag.read, flag.write, flag.create, nodyn.vertxHandler(func));
};

FS.openSync = function(path, flags, mode) {
  var modeString = convertModeToString(mode);
  var flag = mapOpenFlags(flags);
  try {
    return system.openSync(path, modeString, flag.read, flag.write, flag.create);
  } catch(e) {
    throw new Error(e.toString());
  }
};

FS.writeFile = function(filename, data, options, callback) {
  var buffer;
  if (typeof options === 'function') {
    callback = options;
    options = {
      // default values
      'encoding': 'utf8',
      'mode': 0666,
      'flag': 'w'
    };
  }
  if (data instanceof Buffer) {
    buffer = data.delegate;
  } else {
    buffer = new org.vertx.java.core.buffer.Buffer( data.toString() );
  }
  system.writeFile(filename, buffer, nodyn.vertxHandler(callback));
};

FS.chmod = function(path, mode, callback) {
  system.chmod(path, convertModeToString(mode), nodyn.vertxHandler(callback));
};
FS.fchmod = FS.chmod;
FS.lchmod = FS.chmod;

FS.chmodSync = function(path, mode) {
  system.chmodSync(path, convertModeToString(mode));
};
FS.fchmodSync = FS.chmodSync;
FS.lchmodSync = FS.chmodSync;


FS.mkdir = function(path, mode, callback) {
  // CreateParent boolean will always be false as NodeJS
  // does not support this option
  mode = mode || 0777;
  system.mkdir(path, convertModeToString(mode), false, nodyn.vertxHandler(callback));
};

FS.mkdirSync = function(path, mode) {
  system.mkdirSync(path, convertModeToString(mode), false);
  return this;
};

FS.link = function(src, dest, callback) {
  system.symlink(dest, src, nodyn.vertxHandler(callback));
};

FS.linkSync = function(src, dest) {
  system.symlinkSync(dest, src);
};

FS.symlink = FS.link;
FS.symlinkSync = FS.linkSync;

FS.createReadStream = function(path, opts) {
  return new FS.ReadStream(path, opts);
};

FS.ReadStream = function(path, options) {
  Stream.Readable.call(this);
  options = util._extend({
    highWaterMark: 64 * 1024
  }, options || {});

  this.path = path;
  this.fd = options.hasOwnProperty('fd') ? options.fd : null;
  this.flags = options.hasOwnProperty('flags') ? options.flags : 'r';
  this.mode = options.hasOwnProperty('mode') ? options.mode : 438; /*=0666*/

  this.start = options.hasOwnProperty('start') ? options.start : undefined;
  this.end = options.hasOwnProperty('end') ? options.end : undefined;
  this.autoClose = options.hasOwnProperty('autoClose') ?
      options.autoClose : true;
  this.pos = undefined;

  if (!util.isUndefined(this.start)) {
    if (!util.isNumber(this.start)) {
      throw TypeError('start must be a Number');
    }
    if (util.isUndefined(this.end)) {
      this.end = Infinity;
    } else if (!util.isNumber(this.end)) {
      throw TypeError('end must be a Number');
    }

    if (this.start > this.end) {
      throw new Error('start must be <= end');
    }
    this.pos = this.start;
  }

  if (!this.fd) this.open();

  this.on('end', function() {
    if (this.autoClose) {
      this.destroy();
    }
  });
};

util.inherits(FS.ReadStream, Stream.Readable);

FS.ReadStream.prototype.open = function() {
  FS.open(this.path, 'r', openReadable(this));
};

FS.ReadStream.prototype._read = function(size) {
  this.resume();
};

FS.ReadStream.prototype.destroy = function() {
  if (this.destroyed)
    return;
  this.destroyed = true;
  this.close();
};

FS.ReadStream.prototype.close = function(cb) {
  var self = this;
  if (cb) this.once('close', cb);

  if (this.closed || !this.fd) {
    if (!this.fd) {
      this.once('open', close);
      return;
    }
    return process.nextTick(this.emit.bind(this, 'close'));
  }
  this.closed = true;
  close();

  function close(fd) {
    FS.close(fd || self.fd, function(er) {
      if (er) self.emit('error', er);
      else self.emit('close');
    });
    self.fd = null;
  }
};

function openReadable(readable) {
  return function(err, asyncFile) {
    if (err) {
      if (readable.autoClose) {
        readable.destroy();
      }
      readable.emit('error', err);
      return;
    }
    asyncFile.endHandler(function(buffer) {
      // end of file signified in node.js as null
      readable.push(null);
    });

    asyncFile.dataHandler(function(buffer) {
      if (!readable.push(new Buffer(buffer))) {
        readable.pause();
      }
    });
    readable.fd = asyncFile;
    readable.pause();
    process.nextTick(readable.emit.bind(readable, 'open'));
  };
}

var Stat = function(delegate) {
  this.size  = delegate.size;
  this.atime = new Date(delegate.lastAccessTime);
  this.mtime = new Date(delegate.lastModifiedTime);
  this.ctime = new Date(delegate.creationTime);

  this.isFile  = function() {
    return delegate.isRegularFile;
  };

  this.isDirectory  = function() {
    return delegate.isDirectory;
  };

  this.isSymbolicLink  = function() {
    return delegate.isSymbolicLink;
  };

  // Bunch of stuff not yet implemented
  this.dev   = undefined;
  this.ino   = undefined;
  this.mode  = undefined;
  this.nlink = undefined;
  this.uid   = undefined;
  this.gid   = undefined;
  this.rdev  = undefined;
  this.blksize = undefined;
  this.blocks  = undefined;
};

function invertAndConvert(x) {
  var e = parseInt(x).toString(2);
  var bitArray = e.split("");
  var convertedString = "";
  if(bitArray[0]=="0") {
    convertedString = convertedString.concat("-");
  }
  else {
    convertedString = convertedString.concat("r");
  }

  if(bitArray[1]=="0") {
    convertedString =  convertedString.concat("-");
  }
  else {
    convertedString = convertedString.concat("w");
  }

  if(bitArray[2]=="0") {
    convertedString =  convertedString.concat("-");
  }
  else {
    convertedString = convertedString.concat("x");
  }
  return convertedString;
}

var modeCache = {};
var convertModeToString = function(mode) {
  if (!mode) {
    mode = 0666;
  }
  if (modeCache[mode]) {
    return modeCache[mode];
  }
  var octalString = mode.toString(8);
  var intArray = octalString.split("");
  var result = "";
  for (var i=0;i<intArray.length;i++) {
    result = result.concat(invertAndConvert(intArray[i]));
  }
  modeCache[mode] = result;
  return result;
};

function mapOpenFlags(flags) {
  var map = {
    read:   false,
    write:  false,
    create: false
  };

  switch(flags) {
    case 'r':
    case 'rs':
      map.read = true;
      break;
    case 'r+':
    case 'rs+':
      map.write = true;
      break;
    case 'w':
      map.write = true;
      map.create = true;
      break;
    case 'wx':
      map.write = true;
      break;
    case 'w+':
      map.read = true;
      map.write = true;
      map.create = true;
      break;
    case 'wx+':
      map.read = true;
      map.write = true;
      break;
    // todo: deal with append modes
  }
  return map;
}

module.exports = FS;
