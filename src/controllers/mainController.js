const path = require('path')

module.exports = {
    index: (req, res) => { 
        return res.sendFile(path.join(__dirname, '../../dist/index.html'));
    }
}