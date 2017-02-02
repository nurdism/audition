/*
 * This file is subject to the terms and conditions defined in
 * LICENSE file, which is part of this source code package.
 * session - Created by Digitroinc.
 */

const { VoiceChannel } = require('discord.js');
const archiver = require('archiver');
const EventEmitter = require('events');
const BufferManager = require('./../buffer/manager');
const path = require('path');
const fs = require('fs-extra');

class Session extends EventEmitter{
  constructor(client, channel, temp, data){
    super();

    if(!(channel instanceof VoiceChannel) ) throw new TypeError('Session channel must be a voice channel!');

    Object.defineProperty(this, 'client', { value: client });

    this.id = channel.id;
    this.channel = channel;
    this.temp = path.join(temp, this.channel.id);
    this.data = data;

    fs.ensureDirSync(this.temp);

    this.files = {};
    this.buffer = new BufferManager(this.temp);
    this.buffer.on('file',(id, file, start, stop)=>{
      if(!this.files[id]) this.files[id] = [];
      this.files[id].push(file);
      this.emit('file', id, file, start, stop);
    });

    this.buffer.on('error',(err) => this.emit('error', err));

    this.on('saving', async () => await this.save() );

    this.started = false;
    this.stopped = false;

    this.listeners = new Map();

    this.listeners.set('voiceStateUpdate', (oldMember, newMember) => {
      if(oldMember.id === this.client.user.id) return;
      const oldChan = oldMember.voiceChannel;
      const newChan = newMember.voiceChannel;
      if( oldChan && oldChan.id === this.channel.id && ( !newChan || newChan.id != this.channel.id ) ){
        this.buffer.end(oldMember.id);
        this.emit('userLeft', oldMember );
      }
      if( !oldChan || oldChan.id !== this.channel.id  && ( newChan && newChan.id === this.channel.id ) ){
        this.emit('userJoined', newMember );
      }
    });

    for(const [event, listener] of this.listeners) client.on(event, listener);

  };

  start(){

    this.channel.join().then( connection => {

      const receiver = connection.createReceiver();

      if(this.started === false){
        this.started = Date.now();
        this.emit('start', this.started );
      }else{
        this.emit('reconnected');
      }

      connection.on('speaking', (user, speaking) => {
        if(this.channel.members.has(user.id)){
          if(speaking){
            this.buffer.create(user.id, user.username)
          }else{
            this.buffer.end(user.id)
          }
        }
      });

      receiver.on('opus', (user, buffer)=> {
        //throwout small buffers
        if(buffer.length > 3) this.buffer.push(user.id, buffer, user.username);
      });
      receiver.on('warn', (warn)=> this.emit('warn', warn));

      connection.on('disconnect', async () => {
        await this.buffer.flush();
        if(this.stopped === false){
          this.emit('disconnected');
          this.start();
        }else{
          this.emit('saving');
        }
      });

      connection.on('error', err => this.emit('error', err));
      connection.on('warn', warn => this.emit('warn', warn));

    });
  }

  stop(){
    this.stopped = Date.now();
    this.channel.leave();
    this.emit('end', this.files, this.started, this.stopped);
  }

  save(){
    return new Promise( (resolve, reject) => {
      const file = path.join(this.temp, `${this.channel.id}.json`);
      fs.writeFile(file, JSON.stringify({
        channel: this.channel.id,
        start: this.started,
        stop: this.stopped,
        files: this.files
      }), (err) => {
        if (err) return reject(err);
        resolve();
      });
    }).then(()=>{
      return new Promise( (resolve, reject) => {
        const zip = fs.createWriteStream(path.join(this.data, `${this.channel.id}-${this.stopped}.zip`));
        const archive = archiver('zip');
        archive.on('error', (err) => reject(err) );
        archive.pipe(zip);
        archive.glob('*.json', {
          cwd: this.temp,
        });
        archive.finalize();
        zip.on('close', () => {
          resolve();
        });
      });
    }).then(()=>{
      return new Promise( (resolve, reject) => {
        fs.remove(path.join( this.temp ), (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }).then(()=>{
      this.emit('saved', this.channel, path.join(this.data, `${this.channel.id}-${this.stopped}.zip`));
    }).catch( err => this.emit('error', err));
  }

  destroy(){
    for(const [event, listener] of this.listeners) this.client.removeListener(event, listener);
    this.listeners.clear();
  }
}

module.exports = Session;