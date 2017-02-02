/*
 * This file is subject to the terms and conditions defined in
 * LICENSE file, which is part of this source code package.
 * opus - Created by Digitroinc.
 */
const path = require('path');
const fs = require('fs');

class OpusBuffer {
  constructor(id, username) {
    this.start = Date.now();
    this.stop = 0;
    this.filename = `${id}-${this.start}.json`;
    this.username = username;
    this.id = id;
    this.buffers = [];
  }

  push(buffer){
    this.buffers.push(buffer)
  }

  end(folder){
    this.stop = Date.now();
    return new Promise( (resolve, reject) => {
      if( this.buffers.length > 0 ){
        fs.writeFile(path.join(folder, this.filename), JSON.stringify({
          username: this.username || null,
          id: this.id || null,
          start: this.start,
          stop: this.stop,
          buffers: this.buffers.map( buffer => { return buffer.toString('hex') })
        }),(err) => {
          if (err) return reject(err);
          resolve(true);
        });
      }else{
        reject(new Error('No buffers to save.'));
      }
    })
  }
}
module.exports = OpusBuffer;