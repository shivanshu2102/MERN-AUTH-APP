import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const hobbiesList = ['Reading', 'Sports', 'Music', 'Traveling', 'Cooking', 'Gaming'];

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        hobbies: []
    });
    const [profileImage, setProfileImage] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { name, username, password, hobbies } = formData;

    const onChange = e => {
        if (e.target.name === 'hobbies') {
            const value = e.target.value;
            let updatedHobbies = [...hobbies];
            
            if (e.target.checked) {
                updatedHobbies.push(value);
            } else {
                updatedHobbies = updatedHobbies.filter(hobby => hobby !== value);
            }
            
            setFormData({ ...formData, hobbies: updatedHobbies });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const onFileChange = e => {
        const file = e.target.files[0];
        if (file) {
          const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
          if (validTypes.includes(file.type)) {
            setProfileImage(file);
          } else {
            setError('Only JPEG, JPG, or PNG images are allowed');
            e.target.value = ''; // Clear the file input
          }
        }
      };

    const onSubmit = async e => {
        e.preventDefault();
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('name', name);
            formDataToSend.append('username', username);
            formDataToSend.append('password', password);
            hobbies.forEach(hobby => formDataToSend.append('hobbies', hobby));
            
            if (profileImage) {
                formDataToSend.append('profile', profileImage);
            }
    
            const res = await axios.post('http://localhost:5000/api/auth/signup', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            console.log('Signup Response:', res.data);
            
            if (res.data.token && res.data.user) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/profile');
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Signup Error:', err.response?.data || err.message);
            setError(err.response?.data?.message || err.response?.data?.msg || 'Signup failed');
        }
    };

    return (
        <div className="auth-container">
            <h1>Sign Up</h1>
            {error && <p className="error">{error}</p>}
            <form onSubmit={onSubmit} encType="multipart/form-data">
                <div className="form-group">
                    <label>Name</label>
                    <input type="text" name="name" value={name} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Username</label>
                    <input type="text" name="username" value={username} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input type="password" name="password" value={password} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Profile Image</label>
                    <input type="file" name="profile" onChange={onFileChange} />
                </div>
                <div className="form-group">
                    <label>Hobbies</label>
                    <div className="hobbies-container">
                        {hobbiesList.map(hobby => (
                            <div key={hobby} className="hobby-item">
                                <input type="checkbox" id={hobby} name="hobbies" value={hobby} checked={hobbies.includes(hobby)} onChange={onChange} />
                                <label htmlFor={hobby}>{hobby}</label>
                            </div>
                        ))}
                    </div>
                </div>
                <button type="submit">Sign Up</button>
            </form>
            <p>Already have an account? <a href="/login">Login</a></p>
        </div>
    );
};

export default Signup;
