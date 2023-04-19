# betafolio-calculator

### Getting Started
- Clone this repository
- Go inside the `src` folder and run - `npm install`
- Then run `gulp`. This will compile all assets (CSS & JS) in the src folder, create a minified version in the `../dist` folder respectively and then start a webserver on port 8888. To change the port number, please open gulpfile.js and change the value of `WEBSERVER_PORT`.
- If you changed the port number or you're deploying to a production environment please change  `var csvDataUrl = "http://localhost:8888/data/Betafolios.csv"` inside `src/js/main.js` and run `gulp` command to effect the changes in the dist.
