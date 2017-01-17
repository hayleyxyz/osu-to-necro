const parser = require('osu-parser');
const AdmZip = require('adm-zip');
const fs = require('fs');
const ArgumentParser = require('argparse').ArgumentParser;

var argParser = new ArgumentParser({
    version: '0.0.1',
    addHelp:true,
    description: 'Argparse example'
});

argParser.addArgument(
    [ '-i', '--input' ],
    {
        help: 'Input .osz or directories to process',
        nargs: '*',
        required: true
    }
);

argParser.addArgument(
    [ '-o', '--output' ],
    {
        help: 'Output directory',
        required: true
    }
);

var args = argParser.parseArgs();

args.input.forEach(input => {
    var stat = fs.statSync(input);

    if(stat.isDirectory()) {
        var files = fs.readdirSync(input);

        files.forEach(entry => {
            if(entry.match(/\.osu$/i)) {
                var mapData = fs.readFileSync(input + '/' + entry);
                var beatmap = parser.parseContent(mapData);
            
                if(!beatmap.AudioFilename.match(/\.mp3$/i)) {
                    console.error('Audio file is not MP3: ' + beatmap.AudioFilename);
                    return;
                }

                var audioData = null;

                files.forEach(fn => {
                    if(fn === beatmap.AudioFilename) {
                        audioData = fs.readFileSync(input + '/' + fn);
                    }
                });

                if(audioData) {
                    generateNecro(beatmap, audioData);
                }
                else {
                    console.error('File not found: ' + beatmap.AudioFilename);
                }
            }
        });
    }
    else {
        var zip = new AdmZip(input);
        var zipFiles = zip.getEntries();

        zipFiles.forEach(entry => {
            if(entry.name.match(/\.osu$/i)) {
                var beatmap = parser.parseContent(entry.getData());
                
                if(!beatmap.AudioFilename.match(/\.mp3$/i)) {
                    console.error('Audio file is not MP3: ' + beatmap.AudioFilename);
                    return;
                }
                
                var audioFile = null;

                zipFiles.forEach(e => {
                    if(e.name === beatmap.AudioFilename) {
                        audioFile = e;
                    }
                });

                if(audioFile) {
                    var audioData = audioFile.getData();
                    generateNecro(beatmap, audioData);
                }
                else {
                    console.error('ZIP entry not found: ' + beatmap.AudioFilename);
                }
            }
        });
    }
});

function generateNecro(beatmap, audioData) {
    var outputName = beatmap.Artist + ' - ' + beatmap.Title + ' [' + beatmap.Version + ']';

    console.log('Processing: ' + outputName);

    var timings = '';

    beatmap.hitObjects.forEach(obj => {
        timings += obj.startTime / 1000;
        timings += '\n';
    });

    fs.writeFileSync(args.output + '/' + outputName + '.txt', timings);
    fs.writeFileSync(args.output + '/' + outputName + '.mp3', audioData);
}