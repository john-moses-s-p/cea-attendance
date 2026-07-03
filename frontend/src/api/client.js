import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const client = axios.create({ baseURL: BASE_URL })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('cea_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On a 401, try one refresh using the stored refresh token, then retry the request.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('cea_refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${BASE_URL}/api/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } }
          )
          localStorage.setItem('cea_access_token', data.access_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return client(original)
        } catch (refreshError) {
          localStorage.removeItem('cea_access_token')
          localStorage.removeItem('cea_refresh_token')
          localStorage.removeItem('cea_user')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default client
