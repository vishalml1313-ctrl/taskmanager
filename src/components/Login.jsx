import { Button, Card, Form, Input, message } from 'antd'
import React, { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import {auth} from '../config/firbase-config'
import { Mail, Lock } from 'lucide-react'

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, values.email, values.password)
        message.success('Logged in successfully')
      } else {
        await createUserWithEmailAndPassword(auth, values.email, values.password)
        message.success('Account created successfully')
      }
      onLogin()
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50'>
      <Card className='w-96 shadow-xl'>
        <h2 className='text-2xl font-bold text-center mb-6'>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <Form form={form} onFinish={handleSubmit} layout='vertical'>
          <Form.Item
            name="email"
            rules={[{ required: true, type: 'email', message: 'Please enter valid email' }]}
          >
            <Input
              size='large'
              placeholder='Email'
              prefix={<Mail className='w-4 h-4 text-gray-400' />}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
          >
            <Input.Password
              size='large'
              placeholder='Password'
              prefix={<Lock className='w-4 h-4 text-gray-400' />}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type='primary'
              htmlType='submit'
              loading={loading}
              block
              size='large'
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </Button>
          </Form.Item>
        </Form>

        <div className='text-center'>
          <Button type='link' onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default Login