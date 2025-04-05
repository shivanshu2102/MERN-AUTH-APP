import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        hobbies: []
    });
    const [profileImage, setProfileImage] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const res = await axios.get('http://localhost:5000/api/auth/profile', {
                    headers: {
                        'x-auth-token': token
                    }
                });
                setUser(res.data.user);
                setFormData({
                    name: res.data.user.name,
                    hobbies: res.data.user.hobbies
                });
            } catch (err) {
                setError(err.response?.data.msg || 'Failed to fetch profile');
                localStorage.removeItem('token');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleHobbyChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            hobbies: checked ? [...prev.hobbies, value] : prev.hobbies.filter(hobby => hobby !== value)
        }));
    };

    const handleFileChange = (e) => {
        setProfileImage(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const formDataToSend = new FormData();
            
            formDataToSend.append('name', formData.name);
            formData.hobbies.forEach(hobby => formDataToSend.append('hobbies', hobby));
            if (profileImage) formDataToSend.append('profile', profileImage);

            const res = await axios.put(
                'http://localhost:5000/api/auth/profile',
                formDataToSend,
                {
                    headers: {
                        'x-auth-token': token,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setUser(res.data.user);
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data.message || 'Update failed');
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({
            name: user.name,
            hobbies: user.hobbies
        });
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="profile-container">
            <h1>Profile</h1>
            {error && <p className="error">{error}</p>}
            
            {!isEditing ? (
                <>
                    <div className="profile-info">
                        {user.profileImage && (
                            <div className="profile-image">
                                <img 
                                    src={`http://localhost:5000/${user.profileImage}`} 
                                    alt="Profile"
                                     
                                />
                            </div>
                        )}
                        <div className="profile-details">
                            <p><strong>Name:</strong> {user.name}</p>
                            <p><strong>Username:</strong> {user.username}</p>
                            {user.hobbies.length > 0 && (
                                <p>
                                    <strong>Hobbies:</strong> {user.hobbies.join(', ')}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="profile-actions">
                        <button onClick={handleEdit} className="edit-btn">Edit Profile</button>
                        <button onClick={handleLogout} className="logout-btn">Logout</button>
                    </div>
                </>
            ) : (
                <form onSubmit={handleSubmit} className="edit-form">
                    <div className="form-group">
                        <label>Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    
                    <div className="form-group">
                        <label>Hobbies</label>
                        <div className="hobbies-container">
                            {['Reading', 'Sports', 'Music', 'Traveling', 'Cooking', 'Gaming'].map(hobby => (
                                <div key={hobby} className="hobby-item">
                                    <input type="checkbox" id={`hobby-${hobby}`} name="hobbies" value={hobby} checked={formData.hobbies.includes(hobby)} onChange={handleHobbyChange} />
                                    <label htmlFor={`hobby-${hobby}`}>{hobby}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>Profile Image</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} />
                    </div>
                    
                    <div className="form-actions">
                        <button type="submit" className="save-btn">Save Changes</button>
                        <button type="button" onClick={handleCancel} className="cancel-btn">Cancel</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default Profile;