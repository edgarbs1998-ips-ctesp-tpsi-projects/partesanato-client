// Globals
const API_URL = 'http://127.0.0.1:8000/';
var gUser = null,
    gPosts = null,
    gComments = null;

// Settings
$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        if (Cookies.get('token')) {
            xhr.setRequestHeader('Authorization', 'Token ' + Cookies.get('token'));
        }
    }
});

// Methods
var displaySearchBar = function () {
    $('.top-searchbar').show();
};

var handlePermissions = function () {
    if (gUser) {
        $('.is_auth').show();
    } else {
        $('.is_auth').hide();
    }

    if (gUser && gUser.is_staff) {
        $('.is_admin').show();
        return;
    } else {
        $('.is_admin').hide();
    }

    if (gPosts && gUser && gPosts.user.id === gUser.id) {
        $(".is_owner_post").show();
    }

    $.each(gComments, function (key, value) {
        if (value && gUser && value.user.id === gUser.id) {
            $('.is_owner_comment[commentid=' + value.id + ']').show();
        }
    });
};

var displaySubmitSuccess = function (message, element) {
    if (typeof element === 'undefined') {
        alert(message);
        return;
    }

    var html = '<li><div class="extra-wrap"><p>' + message + '</p></div></li>';
    element.removeClass('form-error');
    element.addClass('form-success');
    element.html(html);
};

var displaySubmitResult = function (data, element) {
    if (typeof element === 'undefined') {
        var msg = 'ERROR\n\n';
        $.each(data, function (key, value) {
            msg += key.substr(0, 1).toUpperCase() + key.substr(1) + ': ' + value + '\n';
        });
        alert(msg);

        return;
    }

    element.html('');
    element.removeClass('form-success');
    element.addClass('form-error');
    $.each(data, function (key, value) {
        var html = '<li><div class="extra-wrap"><p>';
        html += key.substr(0, 1).toUpperCase() + key.substr(1) + ': ' + value;
        html += '</p></div></li>';

        element.append(html);
    });
    element.append('<br />');
};

var showUserProfile = function (data) {
    var modalUserProfile = $('#modal_user_profile'),
        submitResult = modalUserProfile.find('submit_result'),
        userProfileUpdate = $("#user_profile_update"),
        userProfileBan = $("#user_profile_ban"),
        userProfileUnban = $("#user_profile_unban");

    submitResult.html('');
    $("#user_profile_image").attr('src', data.gravatar);
    $("#user_profile_username").val(data.username);
    $("#user_profile_email").val(data.email);
    $("#user_profile_first_name").val(data.first_name);
    $("#user_profile_last_name").val(data.last_name);
    userProfileUpdate.attr('userid', data.id);
    $("#user_profile_posts").attr('href', 'index.html?user=' + data.id);
    userProfileBan.attr('userid', data.id);
    userProfileUnban.attr('userid', data.id);

    if (gUser && gUser.is_staff) {
        if (data.is_active) {
            userProfileBan.show();
            userProfileUnban.hide();
        } else {
            userProfileBan.hide();
            userProfileUnban.show();
        }
    } else {
        modalUserProfile.find('form input').attr('readonly', 'readonly');
        userProfileUpdate.hide();
    }

    if (data.is_active === false) {
        $("#user_profile_status").html('Banned');
    } else if (data.is_staff === true) {
        $("#user_profile_status").html('Administrator');
    } else {
        $("#user_profile_status").html('Regular User');
    }

    modalUserProfile.show();
};

var requestUserProfile = function (userid) {
    $.ajax({
        url: API_URL + 'users/' + userid + '/',
        method: 'GET',
        dataType: 'json',
        data: {},
        success: function (data, textStatus, jqXHR) {
            showUserProfile(data);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log(jqXHR, textStatus, errorThrown);

            displaySubmitResult(jqXHR.responseJSON);
        }
    })
};

var loadThumbs = function (evt, element) {
    var files = evt.target.files; // FileList object

    if (files) {
        element.html('');
    }

    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {
        // Only process image files.
        if (!f.type.match('image.*')) {
            continue;
        }

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function (file) {
            return function (e) {
                // Render thumbnail.
                var span = document.createElement('span');
                span.innerHTML = ['<img class="thumb" src="', e.target.result, '" title="', encodeURIComponent(file.name), '"/>'].join('');
                element.append(span);
            };
        })(f);

        // Read in the image file as a data URL.
        reader.readAsDataURL(f);
    }
};

var uploadImages = function (postId, element) {
    var files = element[0].files; // FileList object

    // Loop through the FileList
    for (var i = 0, f; f = files[i]; i++) {
        // Only process image files.
        if (!f.type.match('image.*')) {
            continue;
        }

        var formdata = new FormData();
        formdata.append('image', f);

        $.ajax({
            async: false, // Required for SQLite
            url: API_URL + 'posts/' + postId + '/images/',
            data: formdata,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST',
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                var msg = 'One image failed to upload!';
                displaySubmitSuccess(msg);
            }
        });
    }
};

// Functions
function getUrlParameter(parameter) {
    var pageURL = decodeURIComponent(window.location.search.substring(1)),
        urlVariables = pageURL.split('&'),
        parameterName;

    for (var i = 0; i < urlVariables.length; ++i) {
        parameterName = urlVariables[i].split('=');

        if (parameterName[0] === parameter) {
            return parameterName[1] === undefined ? true : parameterName[1];
        }
    }
}

// On Page Load
$(function () {
    // Check for the various File API support.
    if (!window.File || !window.FileReader || !window.FileList) {
        alert('The File APIs are not fully supported in this browser. You won\'t be able to upload images!');
    }

    // Functions
    function hideURLbar() {
        window.scrollTo(0, 1);
    }

    // Hide Url Bar
    setTimeout(hideURLbar, 0);

    // Get current user from Token cookie
    $.ajax({
        url: API_URL + 'auth/user/',
        method: 'GET',
        dataType: 'json',
        data: {},
        success: function (data, textStatus, jqXHR) {
            gUser = data;

            var userProfile = $('#user_profile');
            userProfile.find('a').html('Hello, ' + gUser.username);
            userProfile.find('img').attr('src', gUser.gravatar);
            userProfile.show();
            $('#user_account').hide();

            $('#profile_image').attr('src', gUser.gravatar);
            $('#profile_email').val(gUser.email);
            $('#profile_first_name').val(gUser.first_name);
            $('#profile_last_name').val(gUser.last_name);
            $('#profile_posts').attr('href', 'index.html?user=' + gUser.id);

            handlePermissions();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log(jqXHR, textStatus, errorThrown);

            if (textStatus !== 'error' && Cookies.get('token')) {
                Cookies.remove('token');
                location.reload();
            }

            handlePermissions();
        }
    });

    // Handle Menu
    $('#menu').click(function () {
        $('#menu_box').animate({'top': '0px'}, 500);
    });
    $('#menu_box_close').click(function (e) {
        $('#menu_box').animate({'top': '-700px'}, 500);
    });

    // Handle Login
    $('#modal_login').find('button[type=submit]').click(function (e) {
        e.preventDefault();

        var modalLogin = $('#modal_login');
        var submitResult = modalLogin.find('.submit_result');
        var loginData = {
            username: modalLogin.find('input[name=username]').val(),
            password: modalLogin.find('input[name=password]').val()
        };

        $.ajax({
            url: API_URL + 'auth/login/',
            method: 'POST',
            dataType: 'json',
            data: loginData,
            success: function (data, textStatus, jqXHR) {
                if (modalLogin.find('input[name=remember]').prop('checked')) {
                    Cookies.set('token', data.key, {expires: 15});
                } else {
                    Cookies.set('token', data.key);
                }

                location.reload();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                displaySubmitResult(jqXHR.responseJSON, submitResult);
            }
        });
    });

    // Handle Logoutnote
    $('#logout_user').click(function (e) {
        e.preventDefault();

        if (!confirm("Are you sure you want to logout?")) {
            return;
        }

        $.ajax({
            url: API_URL + 'auth/logout/',
            method: 'POST',
            dataType: 'json',
            data: {},
            success: function (data, textStatus, jqXHR) {
                Cookies.remove('token');

                window.location.replace("index.html");
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                displaySubmitResult(jqXHR.responseJSON);
            }
        });
    });

    // Handle Register
    $('#modal_register').find('button[type=submit]').click(function (e) {
        e.preventDefault();

        var modalRegister = $('#modal_register');
        var submitResult = modalRegister.find('.submit_result');
        var registerData = {
            username: modalRegister.find('input[name=username]').val(),
            email: modalRegister.find('input[name=email]').val(),
            password1: modalRegister.find('input[name=password]').val(),
            password2: modalRegister.find('input[name=password2]').val()
        };

        $.ajax({
            url: API_URL + 'auth/register/',
            method: 'POST',
            dataType: 'json',
            data: registerData,
            success: function (data, textStatus, jqXHR) {
                Cookies.set('token', data.key);
                location.reload();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                displaySubmitResult(jqXHR.responseJSON, submitResult);
            }
        });
    });

    // Handle Profile Update
    $('#profile_update').click(function (e) {
        e.preventDefault();

        var modalProfile = $('#modal_profile');
        var submitResult = modalProfile.find('.submit_result');
        var profileData = {
            email: $("#profile_email").val(),
            first_name: $("#profile_first_name").val(),
            last_name: $("#profile_last_name").val()
        };

        $.ajax({
            url: API_URL + 'auth/user/',
            method: 'PATCH',
            dataType: 'json',
            data: profileData,
            success: function (data, textStatus, jqXHR) {
                var msg = 'User profile updated with success!';
                displaySubmitSuccess(msg, submitResult);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                displaySubmitResult(jqXHR.responseJSON, submitResult);
            }
        });
    });

    // Handle Profile Change Password
    $('#profile_change_password').click(function (e) {
        e.preventDefault();

        var modalChangePassword = $('#modal_change_password');
        var submitResult = modalChangePassword.find('.submit_result');
        var passwordData = {
            old_password: $('#profile_old_password').val(),
            new_password1: $('#profile_new_password').val(),
            new_password2: $('#profile_new_password2').val()
        };

        $.ajax({
            url: API_URL + 'auth/password/change/',
            method: 'POST',
            dataType: 'json',
            data: passwordData,
            success: function (data, textStatus, jqXHR) {
                var msg = 'User password changed with success!';
                displaySubmitSuccess(msg, submitResult);

                $('#profile_old_password').val('');
                $('#profile_new_password').val('');
                $('#profile_new_password2').val('');
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                displaySubmitResult(jqXHR.responseJSON, submitResult);
            }
        });
    });

    // Handle User Profile Update
    $("#user_profile_update").click(function (e) {
        e.preventDefault();

        var userid = $('#user_profile_update').attr('userid');
        var modalUserProfile = $('#modal_user_profile');
        var submitResult = modalUserProfile.find('.submit_result');
        var userProfileData = {
            email: $("#user_profile_email").val(),
            first_name: $("#user_profile_first_name").val(),
            last_name: $("#user_profile_last_name").val()
        };

        $.ajax({
            url: API_URL + 'users/' + userid + '/',
            method: 'PATCH',
            dataType: 'json',
            data: userProfileData,
            success: function (data, textStatus, jqXHR) {
                var msg = 'User profile updated with success!';
                displaySubmitSuccess(msg, submitResult);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                displaySubmitResult(jqXHR.responseJSON, submitResult);
            }
        });
    });

    // Handle User Profile Ban
    $("#user_profile_ban").click(function (e) {
        e.preventDefault();

        if (!confirm("Are you sure you want to ban this user?")) {
            return;
        }

        var userid = $('#user_profile_ban').attr('userid');
        var modalUserProfile = $('#modal_user_profile');
        var submitResult = modalUserProfile.find('.submit_result');
        var userProfileData = {
            is_active: false
        };

        $.ajax({
            url: API_URL + 'users/' + userid + '/',
            method: 'PATCH',
            dataType: 'json',
            data: userProfileData,
            success: function (data, textStatus, jqXHR) {
                var msg = 'The user has been banned!';
                displaySubmitSuccess(msg);

                $("#modal_user_profile").hide();

                if (gUser.id == userid) {
                    Cookies.remove("token");
                    location.reload();
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                displaySubmitResult(jqXHR.responseJSON, submitResult);
            }
        });
    });

    // Handle User Profile Unban
    $("#user_profile_unban").click(function (e) {
        e.preventDefault();

        if (!confirm("Are you sure you want to unban this user?")) {
            return;
        }

        var userid = $('#user_profile_unban').attr('userid');
        var modalUserProfile = $('#modal_user_profile');
        var submitResult = modalUserProfile.find('.submit_result');
        var userProfileData = {
            is_active: true
        };

        $.ajax({
            url: API_URL + 'users/' + userid + '/',
            method: 'PATCH',
            dataType: 'json',
            data: userProfileData,
            success: function (data, textStatus, jqXHR) {
                var msg = 'The user has been unbanned!';
                displaySubmitSuccess(msg);

                $("#modal_user_profile").hide();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);

                displaySubmitResult(jqXHR.responseJSON, submitResult);
            }
        });
    });
});