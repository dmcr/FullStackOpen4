const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')
const jwt = require('jsonwebtoken')

const authenticateToken = (token, response) => {
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken.id) {
        return response.status(401).json({ error: 'token missing or invalid'})
    }
    return decodedToken
}

const getUserByDecodedToken = async (decodedToken) => {
    const user = await User.findById(decodedToken.id)
    return user
}

blogsRouter.get('/', async (req, res, next) => {
    const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
    res.json(blogs.map(blog => blog.toJSON()))
})

blogsRouter.post('/', async (request, response, next) => {
    const body = request.body
    const decodedToken = authenticateToken(request.token)
    const user = await getUserByDecodedToken(decodedToken)

    if(!body.title || !body.url)
        return response.status(400).send()

    const blog = new Blog({
        title: body.title,
        author: body.author,
        url: body.url,
        likes: body.likes || 0,
        user: user._id
    })

    const savedBlog = await blog.save()
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save()

    response.status(200).json(blog.toJSON())
})

blogsRouter.delete('/:id', async (request, response, next) => {
    const decodedToken = authenticateToken(request.token)
    const user = await getUserByDecodedToken(decodedToken)

    let foundBlog = await Blog.findById(request.params.id)   
    foundBlog = foundBlog.toJSON()
    if (!foundBlog || !foundBlog.user || foundBlog.user.toString() !== user._id.toString())
        return response.status(401).json({ error: 'blog does not belong to logged in user' })

    await Blog.findByIdAndDelete(request.params.id)
    response.status(204).end()
})

blogsRouter.put('/:id', async (request, response, next) => {
    authenticateToken(request.token)
    const body = request.body
    let updatedFields = {}
    if (body.likes)
        updatedFields.likes = body.likes
    
    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, updatedFields, { new: true })
    response.status(200).json(updatedBlog.toJSON())
})

blogsRouter.put('/like/:id', async (request, response, next) => {
    authenticateToken(request.token)
    const blogToUpdate = await Blog.findById(request.params.id)
    const newLikes = { likes: blogToUpdate.likes += 1 }
    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, newLikes, { new: true })
    response.status(200).json(updatedBlog.toJSON())
})

module.exports = blogsRouter