/*
 * This file is subject to the terms and conditions defined in
 * LICENSE file, which is part of this source code package.
 * sesx - Created by Digitroinc.
 */

const xml = require('xmlbuilder');
const path = require('path');
const fs = require('fs');

class SESX{
  constructor( options = {} ){

    this.start = (options.start || Date.now());
    this.stop = options.stop;

    this.path = options.path || __dirname;
    this.name = options.name || this.start ;

    let types = {
      8:'0:1',
      16:'0:2',
      24:'0:3',
      32:'0:4',
    };

    this.appBuild = '10.0.1.8';
    this.appVersion = '10.0';
    this.version = '1.3';

    this.bitDepth = options.bitDepth || 16;
    this.sampleRate =  options.sampleRate || 48000;
    this.audioChannels = options.audioChannels || 2 ;
    this.audioChannelType = options.audioChannelType || 'stereo';
    this.encodingType = types[this.bitDepth];

    this.mediaHandlermediaHandler = options.mediaHandlermediaHandler ||`ByteOrdering:0:0;Channels:0:${this.audioChannels};EncodingType:${this.encodingType};FormatType:0:262144;SampleRate:0:${this.sampleRate};StartOffset:0:0;VBRQuality:0:100;`;
    this.mediaHandler = options.mediaHandler || 'AmioLSF';

    this.tracks = new Map();
    this.files = new Map();

  }

  getTrack(name){
   if (this.tracks.has(name)) return this.tracks.get(name);
   const track = [];
   this.tracks.set(name, track);
   return track;
  }

  clip(track, file, name, start, length) {
    if( typeof track == 'object' ){
      if( !track.track ) throw new Error('Missing values1!');
      if( !track.file  ) throw new Error('Missing values2!');
      if( !track.name ) throw new Error('Missing values3!');
      if( !track.start  ) throw new Error('Missing values4!');
      if( !track.length ) throw new Error('Missing values5!');
      if (!this.files.has(track.file)) throw new Error('That file is isn\'t registered!');
    }else{
      if( !track || !file || !name || !start || !length ) throw new Error('Missing values!');
      if (!this.files.has(file)) throw new Error('That file is isn\'t registered!');
    }
    let data = this.getTrack(track.track || track);
    let clip = {
      file: track.file || file,
      name: track.name || name,
      start: ( ( track.start || start ) - this.start ),
      length: track.length || length,
    };
    data.push(clip);
  }

  file(path, name){
    if( !path ) throw new  Error('Missing values!');
    if (this.files.has(name)) throw new Error('That file is already registered!');
    this.files.set( name,{
      id: this.files.size,
      path: path,
      name: name,
    });
  }

  save( file ){

    let sesx = xml
    .create('sesx', {version: '1.0', encoding: 'UTF-8', standalone: false })
    .att('version', this.version);

    let session = sesx
    .ele('session')
    .att('appBuild', this.appBuild)
    .att('appVersion', this.appVersion)
    .att('audioChannelType', this.audioChannelType)
    .att('bitDepth', this.bitDepth)
    .att('sampleRate', this.sampleRate)
    .att('duration', ((this.stop || Date.now()) - this.start) * (this.sampleRate/1000));

    let name = session
    .ele('name')
    .txt(this.name);

    let tracks = session.ele('tracks');

    let files = sesx.ele('files');

    for( let file of this.files.values() ){
      file = xml
      .create('file')
      .att('absolutePath', path.join(file.path, file.name))
      .att('relativePath', file.name)
      .att('importerPrivateSettings', this.mediaHandlermediaHandler)
      .att('mediaHandler', this.mediaHandler)
      .att('id', file.id);
      files.importDocument(file);
    }

    let index = 1;
    this.tracks.forEach(( clips, name, map )=>{

      let audioTrack = xml
      .create('audioTrack')
      .att('index', index)
      .att('id', index + 1000);

      let trackParameters = audioTrack
      .ele('trackParameters')
      .ele('name')
      .txt(name);

      let trackAudioParameters = audioTrack
      .ele('trackAudioParameters')
      .ele('trackOutput')
      .att('outputID', 1000)
      .att('type', 'trackID');

      index++;

      let id = 0;
      for( let clip of clips ){
        let audioClip = xml
        .create('audioClip')
        .att('fileID', this.files.get( clip.file ).id )
        .att('id', id)
        .att('zOrder', id)
        .att('name', clip.name )
        .att('startPoint', ( clip.start ) * ( this.sampleRate / 1000 ) )
        .att('endPoint', ( clip.start + clip.length ) * ( this.sampleRate / 1000 ) )
        .att('sourceInPoint', 0)
        .att('sourceOutPoint', ( clip.length ) * ( this.sampleRate / 1000 ) );
        id++;
        audioTrack.importDocument(audioClip);
      }
      tracks.importDocument(audioTrack);
    });

    let masterTrack = xml
    .create('masterTrack')
    .att('id', 1000)
    .att('index', index);
    tracks.importDocument(masterTrack);

    fs.writeFile( file || path.join(this.path, `${this.name}.sesx`), sesx.end
    ({
      pretty: true,
      indent: '  ',
      newline: '\n',
      allowEmpty: false
    }), (err) => {});

  }
}

module.exports = SESX;