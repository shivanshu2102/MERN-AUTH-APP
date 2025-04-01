import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

  
useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const localUser = JSON.parse(localStorage.getItem('user'));
        
        if (!token) throw new Error('No token found');
        
       
        const res = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: { 'x-auth-token': token }
        });
        
        setUser(res.data.user || res.data); 
      } catch (err) {
        console.error('Profile fetch error:', err);
        
        const localUser = JSON.parse(localStorage.getItem('user'));
        if (localUser) {
          setUser(localUser);
        } else {
          navigate('/login');
        }
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

    if (loading) return <div>Loading...</div>;

    return (
        <div className="profile-container">
            <h1>Profile</h1>
            {error && <p className="error">{error}</p>}
            
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
            
            <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
    );
};

export default Profile;