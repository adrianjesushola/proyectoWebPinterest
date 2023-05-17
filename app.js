require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const hbs = require('hbs');
const fileUpload = require('express-fileupload')
const bcryptjs = require('bcryptjs')

const PORT = process.env.PORT;
hbs.registerPartials(__dirname+'/views/partials');

app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: false}))
app.use(fileUpload());


const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: 'db.db'
    },
    useNullAsDefault: true
});

app.post('/nuevaPubli',  function (req, res) {
    const us = req.body.userId
    cdx ={usuario: us}
    res.render('uploadImage',cdx);
})

app.post('/inicio', async function (req, res) {
    const us = req.body.userId
    const publicaciones = await knex('post');
    const likes = await knex('likes').where({usuario:us});
    for (const pub in publicaciones){
        let liked = false;
        for (const like in likes) {
            if (likes[like].post==publicaciones[pub].id){
                liked=true;
                break;
            }
        }
        publicaciones[pub]['liked']=liked;
        const usuario = await knex('usuarios').where({id:us}).first();
        publicaciones[pub]['username']=usuario.usuario;
    }
    publicaciones.reverse();
    cdx ={usuario: us, posts: publicaciones}
    res.render('todasLasImagenes',cdx);
})

app.post('/Miperfil', async function (req, res) {
    console.log(req.body)
    const us = req.body.userId
    const publicaciones = await knex('post').where({userId:us});
    const likes = await knex('likes').where({usuario:us});
    let pubsLiked = []
    for (const like in likes) {
        const pubLiked = await knex('post').where({id:likes[like].post});
        const usuario = await knex('usuarios').where({id:pubLiked['0'].userId}).first();
        pubLiked[0]['username']=usuario.usuario;
        pubsLiked.push(pubLiked[0]);
    }
    const usuario = await knex('usuarios').where({id:us}).first();
    publicaciones.reverse();
    pubsLiked.reverse();
    cdx ={usuario: us, posts: publicaciones, postsL: pubsLiked, username:usuario.usuario}
    res.render('perfil',cdx);
})

app.get('/login', function (req, res) {
    res.render('login');
})

app.post('/subirImagen', async (req, res) =>{
    const data = req.files.pic.data;
    const descripcion = req.body.descripcion
    const user = req.body.userId
    if (data){
        await  knex.insert({Descripcion:descripcion, imagen:data,userId:user}).into('post');
        const us = req.body.userId
        const publicaciones = await knex('post').where({userId:us});
        const likes = await knex('likes').where({usuario:us});
        let pubsLiked = []
        for (const like in likes) {
            const pubLiked = await knex('post').where({id:likes[like].post});
            pubsLiked.push(pubLiked[0]);
        }
        publicaciones.reverse();
        pubsLiked.reverse();
        cdx ={usuario: us, posts: publicaciones, postsL: pubsLiked}
        res.redirect(307,'Miperfil');
    } else {
        res.sendStatus(400);
    }
})

app.post('/registrar', async (req, res) =>{
    const correo = req.body.correo
    const contra = req.body.contra
    const usuario = req.body.usuario
    let passhash = await bcryptjs.hash(contra, 8)

    const us = await knex('usuarios').where({usuario:usuario}).first();
    if (us){
        res.end((JSON.stringify({resu:1})))
    } else{
        const em = await knex('usuarios').where({correo:correo}).first();
        if (em){
            res.end((JSON.stringify({resu:2})))
        } else {
            await  knex.insert({usuario:usuario, correo:correo,contraseña:passhash}).into('usuarios');
            res.end((JSON.stringify({resu:3})))
        }
    }
})

app.post('/favorito', async (req, res) =>{
    const post = req.body.fotoo
    const usuario = req.body.usuario
    const li = await knex('likes').where({post:post, usuario:usuario}).first();
    if (li){
        await knex('likes').where({post:post, usuario:usuario}).first().del();
        res.end((JSON.stringify({resu:1})))
    } else {
        await knex.insert({usuario:usuario, post:post}).into('likes');
        res.end((JSON.stringify({resu:2})))
    }

})

app.post('/iniciarSesion', async (req, res) =>{
    const correo = req.body.correo
    const contra = req.body.contra
    const em = await knex('usuarios').where({correo:correo}).first();
    if (em){
        let comp = bcryptjs.compareSync(contra,em.contraseña)
        if (comp){
            res.end((JSON.stringify({resu:3, us:em.id})));
        } else{
            res.end((JSON.stringify({resu:2})))
        }
    } else {
        res.end((JSON.stringify({resu:1})))
    }
})

app.post('/editarImagen', async (req, res) =>{
    const pID = req.body.postID
    const post = await knex('post').where({id:pID}).first();
    const user = req.body.userId;
    if (post){
        cdx = {post:post, usuario:user }
        res.render('editImage',cdx);
    }
})
app.post('/editarDesc', async (req, res) =>{
    const pID = req.body.postID
    const post = await knex('post').where({id:pID}).first();
    const user = req.body.usuario;
    const desc = req.body.descripcion;
    if (post){
        await knex('post').where({id:pID}).update({Descripcion: desc});
        cdx = {post:post, usuario:user};
        console.log(cdx)
        res.redirect(307,'/Miperfil');
    }
})

app.post('/eliminarPost', async (req, res) =>{
    const pID = req.body.postID
    const post = await knex('post').where({id:pID}).first();
    const user = req.body.usuario;
    if (post){
        await knex('post').where({id:pID}).del();
        res.redirect(307,'/Miperfil');
    }
})
app.get('/photo/:id', async (req, res) => {
    const id = req.params.id;
    const img = await knex('post').where({id:id}).first();
    if (img) {
        res.end(img.imagen);
    } else {
        res.end('no existe ese post')
    }
})

app.listen(PORT);
