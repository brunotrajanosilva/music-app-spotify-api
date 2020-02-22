const carousel_options = {
	loop: true,
	margin: 15,
	responsiveClass: true,
	responsive: {
		0: {
			items: 1,
			loop: false,
		},
		400: {
			items: 2,
			loop: false,
		},
		1000: {
			items: 5,
			loop: false,
		}
	}
}


const get_data_mixin = {
	methods:{
		get_and_assign_data(url, variable_name, param={}){
			axios.get(url, {params: param}).then(r=>{
				this[variable_name] = r.data;
			}).catch(error=>{
				console.log(error);
				Cookies.remove('access_token');
			});
		},

		next_page(url){
			axios.get(url.next).then(r=>{
				url.items = url.items.concat(r.data.items);
				url.next = r.data.next;
			}).catch(error=>{
				console.log(error);
				Cookies.remove('access_token');
			});	
		},
	}
}

//components
const index = {
	template: '<div v-if="new_releases">\
		<h1>New Releases</h1>\
		<owl v-if="new_releases" :data_prop="new_releases.albums.items"></owl>\
	</div>',
	mounted(){
		let url = "https://api.spotify.com/v1/browse/new-releases";

		this.get_and_assign_data(url, 'new_releases')
	},
	data(){
		return{
			new_releases: null,
		}
	},
	mixins: [get_data_mixin],
}

const album = {
	mounted(){
		let url = "https://api.spotify.com/v1/albums/"+ this.$route.params.id;

		this.get_and_assign_data(url, 'album');
	},
	template: '<div v-if="album">\
		<img :src="album.images[1]? album.images[1].url : null" >\
		<h1>{{album.name}}</h1>\
		<div>\
		<router-link v-if="album.artists" class="comma-item" v-for="artist in album.artists"\
		:to="{name: \'artist\', params:{id: artist.id}}">{{artist.name}}</router-link>\
		</div></br>\
		<web_player :embed_media_value="album.external_urls.spotify"></web_player>\
	</div>',
	data(){
		return{
			album: null,
		}
	},
	mixins: [get_data_mixin],
};

const artist = {
	mounted(){
		let base_url = "https://api.spotify.com/v1/artists/"+ this.$route.params.id;

		let artist_url = base_url
		this.get_and_assign_data(artist_url, 'artist');

		let artist_top_tracks_url = base_url+'/top-tracks/';
		this.get_and_assign_data(artist_top_tracks_url, 'artist_top_tracks', {country: 'SE'});

		let artist_albums_url = base_url+"/albums/";
		this.get_and_assign_data(artist_albums_url, 'artist_albums', {include_groups: 'album', limit:10});

		let related_artists_url = base_url+"/related-artists/";
		this.get_and_assign_data(related_artists_url, 'related_artists');

	},
	template: '<div v-if="artist">\
		<img class="main-image" :src="artist.images[1]? artist.images[1].url: null " >\
		<h1>{{artist.name}}</h1>\
		<p>Genres: <span v-for="genre in artist.genres" class="comma-item">{{genre}}</span></p></br>\
		<div v-if="artist_top_tracks.tracks">\
			<h1>Top Tracks</h1>\
			<owl :data_prop="artist_top_tracks.tracks"></owl></br>\
		</div>\
		<div v-if="artist_albums.items">\
			<h1>Albums</h1>\
			<grid-items @see_more="next_page(artist_albums)"\
			:grid_items="artist_albums.items" :has_next="artist_albums.next"></grid-items></br>\
		</div>\
		<div v-if="related_artists">\
			<h1>Related Artists</h1>\
			<owl v-if="related_artists" :data_prop="related_artists.artists"></owl>\
		</div>\
	</div>',
	data(){
		return{
			artist: false,
			artist_top_tracks: false,
			artist_albums: false,
			related_artists: false,
		}
	},
	mixins: [get_data_mixin],
};

const search = {
	mounted(){
		let query = this.$route.query.q;

		if(query){
			this.search = query;
			let url = 'https://api.spotify.com/v1/search';
			let params = {q: query, type:'album,artist,track', limit:10};

			this.get_and_assign_data(url, 'search_results', params);
		}
	},
	template: '<div>\
		<form class="form-inline" @submit.prevent.stop="submit()">\
		<div class="input-group md-form form-sm form-2 pl-0">\
			<input class="form-control my-0 py-1" type="text" placeholder="Search"\
			aria-label="Search" v-model="search">\
			<div class="input-group-append">\
				<button type="submit" class="input-group-text bg-dark border border-dark"><i\
				class="fas fa-search text-white" aria-hidden="true"></i></button>\
			</div>\
		</div>\
		</form></br>\
		<div v-if="search_results">\
			<h1>Tracks</h1>\
			<grid-items @see_more="search_next_page(\'tracks\')"\
			:grid_items="search_results.tracks.items" :has_next="search_results.tracks.next"></grid-items>\
		</div></br>\
		<div v-if="search_results">\
			<h1>Artists</h1>\
			<grid-items @see_more="search_next_page(\'artists\')"\
			:grid_items="search_results.artists.items" :has_next="search_results.artists.next"></grid-items>\
		</div></br>\
		<div v-if="search_results">\
			<h1>Albums</h1>\
			<grid-items @see_more="search_next_page(\'albums\')"\
			:grid_items="search_results.albums.items" :has_next="search_results.albums.next"></grid-items>\
		</div>\
	</div>',
	data(){
		return{
			search: '',
			search_results: null,
		}
	},
	methods:{
		submit(){
			router.push({name: 'search', query: {q: this.search}})
		},
		search_next_page(name_result){

			let result = this.search_results[name_result];
			axios.get(result.next).then(r=>{
				result.items = result.items.concat(r.data[name_result].items);
				result.next = r.data[name_result].next;
			}).catch(error=>{
				console.log(error);
				Cookies.remove('access_token');
			});
			
		},
	},
	mixins: [get_data_mixin],
}

const owl = {
	template: '<div class="owl-carousel owl-theme">\
		<div v-for="item in data_prop" class="item" :key="item.id"\>\
			<card :card_item="item"></card>\
		</div>\
	</div>',
	props:['data_prop'],
	mounted(){
		$(".owl-carousel").owlCarousel(carousel_options);
	},
}

const grid_items = {
	template: '<div>\
		<div class="grid-cards">\
			<card v-for="grid_item in grid_items" :card_item="grid_item"></card>\
		</div>\
		<a class="grid-more" v-if="has_next" @click="$emit(\'see_more\')"><i class="fas fa-angle-down"></i></a>\
	</div>',
	props:['grid_items', 'has_next']
}

const card = {
	template: '<div class="card-item">\
		<router-link :to="router_push(card_item)">\
		<div class="card-image" :style="image_style()">\
			<img src="blank-image" alt="" />\
		</div>\
		</router-link>\
		<div class="card-details">\
			<router-link :to="router_push(card_item)">\
				<h3 class="details-title">{{card_item.name}}</h3>\
			</router-link>\
			<p class="details-text">\
				<router-link v-if="card_item.artists" class="comma-item" v-for="(artist, index) in card_item.artists"\
				:to="router_push(artist)">{{artist.name}}</router-link>\
				<a v-if="card_item.genres" class="comma-item" v-for="(genre, index) in card_item.genres">{{genre}}</a>\
			</p>\
		</div>\
	</div>',
	props: ['card_item'],
	methods:{
		router_push(item){
			let type = item.type;
			let name = '';
			let param = '';

			if(type == 'track'){
				name = 'album';
				param = item.album.id;
			}else{
				name = type;
				param = item.id
			}

			return {name: name, params: {id:param}};
		},
		image_style(){
			let card_item = this.card_item;
			let image_url = '';

			if(card_item.images){
				image_url = card_item.images[1]? card_item.images[1].url : null;
			}else if(card_item.album.images){
				image_url = card_item.album.images[1]? card_item.album.images[1].url : null;
			}

			let result = {backgroundImage: `url('${image_url}'), url('images/no_img.webp')`};
			return result;
		}
	}
}

const web_player = {
	template: '<div>\
		<iframe :src="embed_media()" width="300"\
		height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>\
	</div>',
	props: ['embed_media_value'],
	methods:{
		embed_media(){
			let base_url = "https://open.spotify.com/";
			let external_url = this.embed_media_value;

			let replace_str = external_url.replace(base_url, base_url+'embed/');

			return replace_str;
		}
	}
}

const layout = {
	template: '<div>\
		<nav class="navbar navbar-light bg-light justify-content-between">\
			<router-link :to="{name: \'index\'}">\
				<a class="navbar-brand p-0"><i class="fab fa-spotify fa-lg"></i></a>\
			</router-link>\
			<form class="form-inline" @submit.prevent.stop="submit()">\
			<div class="input-group md-form form-sm form-2 pl-0">\
				<input class="form-control my-0 py-1" type="text" placeholder="Search" aria-label="Search" v-model="search">\
				<div class="input-group-append">\
					<button type="submit" class="input-group-text bg-dark border border-dark"><i\
					class="fas fa-search text-white" aria-hidden="true"></i></button>\
				</div>\
			</div>\
			</form>\
		</nav>\
		<div class="body-container">\
			<slot></slot>\
		</div>\
		<footer class="p-2">\
			<div class="footer-copyright text-center">© 2020 Copyright:\
				<a href="https://mdbootstrap.com/education/bootstrap/"> MDBootstrap.com</a>\
			</div>\
		</footer>\
	</div>',
	data(){
		return{
			search: '',
		}
	},
	methods:{
		submit(){
			router.push({name: 'search', query: {q: this.search}})
		},
	}
}


Vue.component('index', index);
Vue.component('album', album);
Vue.component('artist', artist);
Vue.component('search', search);
Vue.component('owl', owl);
Vue.component('card', card);
Vue.component('grid-items', grid_items);
Vue.component('web_player', web_player);
Vue.component('layout', layout);


const routes = [
	{ path: '/', component: index, name:"index" },
	{ path: '/albums/:id', component: album, name:"album" },
	{ path: '/artists/:id', component: artist, name:"artist" },
	{ path: '/search', component: search, name:"search", props: (route) => ({ query: route.query.q }) },
];

const router = new VueRouter({
	routes
});


var app = new Vue({
	router,
	el: "#app",
	data: {
		has_token: false,
	},
	mounted(){
		this.check_token();
	},
	methods:{
		check_token(){
			let get_token = Cookies.get("access_token");
			let get_refresh = Cookies.get("refresh_token");

			if(get_token){
				console.log('has_token');
				axios.defaults.headers.common['Authorization'] = "Bearer " + get_token;
				this.has_token = true;
			}else if(get_refresh){
				this.refresh_token();
				console.log('has_refresh_token');
			}
		},
		refresh_token(){
			let get_refresh = Cookies.get("refresh_token");
			let vm = this;

			$.ajax({
				url: "/refresh_token",
				data: {
					refresh_token: get_refresh
				}
			}).done(function(data) {
				let access_token = data.access_token;
				let expires_in = data.expires_in;
		
				let expires_seconds = new Date(new Date().getTime() + expires_in * 1000);
		
				Cookies.set("access_token", access_token, { expires: expires_seconds });
				vm.check_token();
			});
		}
	}
});
