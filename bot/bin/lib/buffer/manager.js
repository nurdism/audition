/*
 * This file is subject to the terms and conditions defined in
 * LICENSE file, which is part of this source code package.
 * manager - Created by Digitroinc.
 */

const OpusBuffer = require('./opus');
const EventEmitter = require('events');

class BufferManager extends EventEmitter{
  constructor( folder ){
    super();
    this.buffers = new Map();
    this.folder = folder;
  }

  async flush(){
    for(const id of this.buffers.keys()){
     await this.end(id)
    }
  }

  get(id, username){
    if(this.buffers.has(id)) return this.buffers.get(id);
    const buffer = new OpusBuffer(id, username);
    this.buffers.set(id,buffer);
    return buffer;
  }

  create(id, username){
    this.get(id, username);
  }

  push(id, buffer, username){
    this.get(id, username).push(buffer);
  }

  async end(id){
    if(!this.buffers.has(id)) return;
    const buffer = this.get(id);
    try{
      await buffer.end(this.folder);
      this.emit('file', id, buffer.filename, buffer.start, buffer.stop );
    }catch (err){
      this.emit('error', err);
    }
    this.buffers.delete(id);
  }
}

module.exports = BufferManager;