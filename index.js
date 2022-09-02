require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./config/database');
const bcrypt = require('bcrypt');
const path = require('path');
const jwt = require('jsonwebtoken');
// Middlewares
// const {createToken, verifyAToken} = require('./middleware/AuthenticateUser');
// const {errorHandling} = require('./middleware/ErrorHandling');
const cookieParser = require('cookie-parser');
// Express app
const app = express();
app.use(express.static('views'))
// Set header
app.use((req, res, next)=>{
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

// Express router
const router = express.Router();
// Configuration
const port = parseInt(process.env.PORT) || 4000;
app.use(router, cors(), express.json(), cookieParser(),  bodyParser.urlencoded({ extended: true }));
app.listen(port, ()=> {console.log(`Server is running on port ${port}`)});

// Home = Root
router.get('/', (req, res)=> {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
})
// REGISTER
router.post('/users', bodyParser.json(),(req, res)=>{
    let emails = `SELECT email FROM users WHERE ?`;
    let email = {
        email: req.body.email
    }
    db.query(emails, email, async(err, results)=>{
        if(err) throw err
        // VALIDATION
        if (results.length > 0) {
            res.send("The email provided is already registered. Enter another email to successfully register");
        } else {
            const bd = req.body;
   
            let generateSalt = await bcrypt.genSalt();
            bd.password = await bcrypt.hash(bd.password, generateSalt);
            console.log(bd);
            // Query
            const strQry =
            `
            INSERT INTO users(user_fullname, email, password, userRole, phone_number, join_date)
            VALUES(?, ?, ?, ?, ?, ?);
            `;
            //
            db.query(strQry,
                [bd.user_fullname, bd.email, bd.password, bd.userRole, bd.phone_number, bd.join_date],
                (err, results)=> {
                    if(err) throw err;
                    res.send(`number of affected row/s: ${results.affectedRows}`);
                })
        }
    })
})
// LOGIN
router.post('/login', bodyParser.json(), (req, res)=> {
    const strQry = `SELECT * FROM users WHERE ? ;`;
    let user = {
        email: req.body.email
    };
    db.query(strQry, user, async(err, results)=> {
        if (err) throw err;
        if (results.length === 0) {
            res.send('Email not found. Please register')
        } else {
            const isMatch = await bcrypt.compare(req.body.password, results[0].password);
            if (!isMatch) {
                res.send('Password is Incorrect')
            } else {
                const payload = {
                    user: {
                      user_fullname: results[0].user_fullname,
                      email: results[0].email,
                      password: results[0].password,
                      userRole: results[0].userRole,
                      phone_number: results[0].phone_number,
                      join_date: results[0].join_date,
                    },
                  };
                jwt.sign(payload,process.env.SECRET_KEY,{expiresIn: "365d"},(err, token) => {
                    if (err) throw err;
                    res.send(token)
                  }
                );
            }
        }
    })
})
// GET ALL USERS
router.get('/users', (req, res)=> {
    // Query
    const strQry =
    `
    SELECT user_id, user_fullname, email, password, userRole, phone_number, join_date
    FROM users;
    `;
    db.query(strQry, (err, results)=> {
        if(err) throw err;
        res.setHeader('Access-Control-Allow-Origin','*')
        res.json({
            status: 200,
            users: results
        })
    })
});
// GET ONE USER
router.get('/users/:user_id', (req, res)=> {
    const strQry =
    `SELECT user_id, user_fullname, email, password, userRole, phone_number, join_date, cart,  favourites
    FROM users
    WHERE user_id = ?;
    `;
    db.query(strQry, [req.params.user_id], (err, results) => {
        if(err) throw err;
        res.setHeader('Access-Control-Allow-Origin','*')
        res.json({
            status: 204,
            results: (results.length < 1) ? "Sorry, no data was found." : results
        })
    })
});
// VERIFY USER
router.get("/users/verify", (req, res) => {
    const token = req.header("x-auth-token");
    jwt.verify(token, process.env.jwtSecret, (error, decodedToken) => {
      if (error) {
        res.status(401).send("Unauthorized Access!");
      } else {
        res.status(200).send(decodedToken);
      }
    });
  });
// Delete a user
router.delete('/users/:user_id', (req, res)=> {
    const strQry =
    `
    DELETE FROM users
    WHERE user_id = ?;
    `;
    db.query(strQry,[req.params.user_id], (err)=> {
        if(err) throw err;
        res.status(200).json({msg: "A user was deleted."});
    })
})
// CREATE PRODUCT
router.post('/products', bodyParser.json(), (req, res)=> {
    const bd = req.body;
    bd.totalamount = bd.quantity * bd.price;
    // Query
    const strQry =
    `
    INSERT INTO products(title, catergory, description, imgURL,quantity, price, created_by )
    VALUES(?, ?, ?, ?, ?, ?, ?);
    `;
    //
    db.query(strQry,
        [bd.title, bd.catergory, bd.description, bd.imgURL, bd.quantity, bd.price, bd.created_by ],
        (err, results)=> {
            if(err) throw err;
            res.status(201).send(`number of affected row/s: ${results.affectedRows}`);
        })
});
// GET ALL PRODUCTS
router.get('/products', (req, res)=> {
    // Query
    const strQry =
    `
    SELECT product_id, title, catergory, description, imgURL, quantity, price, created_by
    FROM products;
    `;
    db.query(strQry, (err, results)=> {
        if(err) throw err;
        res.status(200).json({
            status: 'ok',
            products: results
        })
    })
});
// GET ONE PRODUCT
    router.get('/products/:product_id', (req, res)=> {
        // Query
        const strQry =
        `SELECT product_id, title, catergory, description, imgURL, quantity, price, created_by
        FROM products
        WHERE product_Id = ?;
        `;
        db.query(strQry, [req.params.product_id], (err, results)=> {
            if(err) throw err;
            res.setHeader('Access-Control-Allow-Origin','*')
            res.json({
                status: 200,
                results: (results.length <= 0) ? "Sorry, no product was found." : results
            })
        })
    });
// UPDATE PRODUCT
router.put('/products/:product_id', bodyParser.json(), (req, res)=> {
    const bd = req.body;
    // Query
    const strQry =
    `UPDATE products
     SET ?
     WHERE product_id = ?`;
     db.query(strQry, [bd, req.params.product_id], (err)=> {
        if(err) throw err;
        res.send('Product ubdated');
    })
});

// DELETE PRODUCT
router.delete('/products/:product_id', (req, res)=> {
    // Query
    const strQry =
    `
    DELETE FROM products
    WHERE product_id = ?;
    `;
    db.query(strQry,[req.params.product_id], (err, data, fields)=> {
        if(err) throw err;
        res.send(`${data.affectedRows} row was affected`);
    })
});
// get products by catergory
router.get('/productCategory/:catergory', (req, res)=> {
    // Query
    const strQry =
    `SELECT product_Id, title, catergory, description, imgURL, quantity, price, created_by
    FROM products
    WHERE catergory = ?;
    `;
    db.query(strQry, [req.params.catergory], (err, results)=> {
        if(err) throw err;
        res.json({
            status: 200,
            results: results
        })
    })
});

// cart
router.get('/users/:id/cart', (req, res)=>{
    const cart = `select cart from users where user_id = ${req.params.id}`
    db.query(cart,(err, results)=>{
        if(err) throw err 
        res.json({
            status:200, 
            results:JSON.parse(results[0].cart)
        })

    })
})

router.post('/users/:id/cart', bodyParser.json(),(req, res)=>{
    let route = req.params
    const cart = `select cart from users where user_id = ${route.id}`
    db.query(cart,(err, results)=>{
        if(err)throw err
        if(results.length > 0 ){
            let cart
            if(results[0].cart == null){
                cart = []
                
            }else{
                cart = JSON.parse(results[0].cart)
            }
        let product = {
            'cart_id' : cart.length + 1, 
            'title' : req.body.title,
            'catergory':  req.body.catergory,
            'description': req.body.description,
            'imgURL': req.body.imgURL,
            'quantity': parseInt(req.body.quantity) -1,
            'price': req.body.price,
            'created_by':req.body.created_by


        }
        cart.push(product)
        const addCart = `update users set cart = ? where user_id = ${req.params.id}`
        db.query (addCart, JSON.stringify(cart), (err, results)=>{
            if(err)throw err 
            res.json ({
                status: 200,
                message: 'successfully added item'
            })
        })
        } else{
            res.json({
                status: 404,
                message: 'there is no user with that id'
            })
        }
    })
})

// favourites

router.get('/users/:id/fav', (req, res)=>{
    const favourites = `select favourites from users where user_id = ${req.params.id}`
    db.query(favourites,(err, results)=>{
        if(err) throw err 
        res.json({
            status:200, 
            results:JSON.parse(results[0].favourites)
        })

    })
})

router.post('/users/:id/fav', bodyParser.json(),(req, res)=>{
    let route = req.params
    const fav = `select cart from users where user_id = ${route.id}`
    db.query(fav,(err, results)=>{
        if(err)throw err
        if(results.length > 0 ){
            let fav
            if(results[0].fav == null){
                fav = []
                
            }else{
                fav = JSON.parse(results[0].fav)
            }
        let product = {
            'fav_id' : fav.length + 1, 
            'title' : req.body.title,
            'catergory':  req.body.catergory,
            'description': req.body.description,
            'imgURL': req.body.imgURL,
            'quantity': parseInt(req.body.quantity) -1,
            'price': req.body.price,
            'created_by':req.body.created_by


        }
        fav.push(product)
        const addFav = `update users set  favourites = ? where user_id = ${req.params.id}`
        db.query (addFav, JSON.stringify(fav), (err, results)=>{
            if(err)throw err 
            res.json ({
                status: 200,
                message: 'successfully added item'
            })
        })
        } else{
            res.json({
                status: 404,
                message: 'there is no user with that id'
            })
        }
    })
})

module.exports = {
    devServer: {
        Proxy: '*'
    }
}














