/*
 * This file is subject to the terms and conditions defined in
 * LICENSE file, which is part of this source code package.
 * manager - Created by Digitroinc. 
 */

const Session = require('./base');
const fs = require('fs-extra');

class SessionManager {
  constructor( client, temp, data ){
    this.temp = temp;
    this.data = data;

    this.sessions = new Map();
    fs.ensureDirSync(this.temp);
    fs.ensureDirSync(this.data);

    Object.defineProperty(this, 'client', { value: client });
  }

  has(guild){
    return this.sessions.has(guild.id);
  }

  get(guild){
    if(this.sessions.has(guild.id)) return this.sessions.get(guild.id);
  }

  create(guild, channel){
    if(this.sessions.has(guild.id)) throw new Error('That guild already has a session started!');
    const session = new Session(this.client, channel, this.temp, this.data );
          session.on('saved', (channel) =>{
            session.destroy();
            this.sessions.delete(channel.guild.id)
          });
    this.sessions.set(guild.id, session);
    return session;
  }

  end(guild){
    this.sessions.get(guild.id).stop();
  }
}

module.exports = SessionManager;