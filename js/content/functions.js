function formatMoney(amount, decimalCount = 2, decimal = ".", thousands = ",") {
  try {
    decimalCount = Math.abs(decimalCount);
    decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

    const negativeSign = amount < 0 ? "-" : "";

    let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
    let j = (i.length > 3) ? i.length % 3 : 0;

    return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
  } catch (e) {
    console.log(e)
  }
};

function run_script(code){
	var script = document.createElement('script');
	script.appendChild(document.createTextNode(code));
	(document.head||document.documentElement).appendChild(script);
	script.parentNode.removeChild(script);
}

function capitalizeFirstLetter(string) {
  	return string.charAt(0).toUpperCase() + string.slice(1);
}

function relayAjax(options, retries=20, delay=30000, timeout=90000){
	options.timeout = timeout;
    jQuery.ajax(options)
    .fail(function(){
        if (retries > 0) {
            console.log('Koneksi error. Coba lagi '+retries);
            setTimeout(function(){ 
                relayAjax(options, --retries, delay, timeout);
            },delay);
        } else {
            alert('Capek. Sudah dicoba berkali-kali error terus. Maaf, berhenti mencoba.');
        }
    });
}

function singkronisasi_ssh(options){
	if(options.status == 'error'){
		alert(options.message);
		jQuery('#wrap-loading').hide();
	}else{
		var data_ssh = {};
		options.data.map(function(b, i){
			var rek = b.kode_kel_standar_harga.split('.');
			var golongan = rek[0]+'.'+rek[1]+'.'+rek[2]+'.'+rek[3]+'.'+rek[4];
			var kelompok = golongan+'.'+rek[5];
			var sub_kelompok = b.kode_kel_standar_harga;
			var item_ssh = b.kode_standar_harga;
			if(!data_ssh[golongan]){
				data_ssh[golongan] = {
					nama: golongan,
					jenis: b.kelompok,
					data: {}
				}
			}
			if(!data_ssh[golongan].data[kelompok]){
				data_ssh[golongan].data[kelompok] = {
					nama: kelompok,
					jenis: b.kelompok,
					data: {}
				}
			}
			if(!data_ssh[golongan].data[kelompok].data[sub_kelompok]){
				data_ssh[golongan].data[kelompok].data[sub_kelompok] = {
					nama: sub_kelompok,
					jenis: b.kelompok,
					data: {}
				}
			}
			data_ssh[golongan].data[kelompok].data[sub_kelompok].data[item_ssh] = {
				nama: item_ssh,
				jenis: b.kelompok,
				data: b
			}
		});
		run_script('window.data_ssh = '+JSON.stringify(data_ssh)+'; console.log(data_ssh);');
		relayAjax({
			url: config.fmis_url+'/parameter/ssh/struktur-ssh/golongan/datatable',
			success: function(golongan){
				var data_all = [];
				var no_urut_golongan = 0;
				for(var gol_id in data_ssh){
					var nama_golongan = data_ssh[gol_id].nama;
					var jns_golongan = data_ssh[gol_id].jenis;
					if(jns_golongan == 1){
						var jns_ssh = 1;
					}else{
						continue;
					}
					var cek = false;
					golongan.data.map(function(b, i){
						if(b.uraian == nama_golongan){
							cek = true;
						}
						if(no_urut_golongan < b.kdurut){
							no_urut_golongan = b.kdurut;
						}
					});
					if(cek == false){
						no_urut_golongan++;
						data_all.push({
							url: config.fmis_url+'/parameter/ssh/struktur-ssh/golongan/save',
				            type: "post",
				            data: {
				                _token: _token,
				                kdurut: no_urut_golongan,
				                jns_ssh: jns_ssh,
				                uraian: nama_golongan
				            }
						});
					}
				}
				var last = data_all.length;
				data_all.reduce(function(sequence, nextData){
                    return sequence.then(function(current_data){
                		return new Promise(function(resolve_redurce, reject_redurce){
		                	current_data.success = function(data){
								return resolve_redurce(current_data);
							};
							current_data.error = function(argument) {
								console.log(e);
								return resolve_redurce(current_data);
							};
		                	relayAjax(current_data);
		                })
                        .catch(function(e){
                            console.log(e);
                            return Promise.resolve(nextData);
                        });
                    })
                    .catch(function(e){
                        console.log(e);
                        return Promise.resolve(nextData);
                    });
                }, Promise.resolve(data_all[last]))
                .then(function(data_last){
            		run_script("initDatatable('golongan');");
					singkronisasi_ssh_kelompok(data_ssh);
                })
                .catch(function(e){
                    console.log(e);
                });	
			}
		});
	}
}

function singkronisasi_ssh_kelompok(data_ssh){
	relayAjax({
		url: config.fmis_url+'/parameter/ssh/struktur-ssh/golongan/datatable',
		success: function(golongan){
			var data_all = [];
			var sendData = [];
			for(var gol_id in data_ssh){
				var nama_golongan = data_ssh[gol_id].nama;
				var kode_golongan = '';
				golongan.data.map(function(b, i){
					if(b.uraian == nama_golongan){
						kode_golongan = b.action.split('code="')[1].split('"')[0];
					}
				});
				if(kode_golongan != ''){
					data_ssh[gol_id].code = kode_golongan;
					sendData.push(new Promise(function(resolve, reject){
						relayAjax({
							url: config.fmis_url+'/parameter/ssh/struktur-ssh/kelompok/datatable?code='+data_ssh[gol_id].code+'&gol_id='+gol_id,
							success: function(kelompok){
								var _gol_id = this.url.split('&gol_id=')[1];
								// console.log('gol_id', _gol_id);
								var no_urut_kelompok = 0;
								for(var kelompok_id in data_ssh[_gol_id].data){
									var nama_kelompok = data_ssh[_gol_id].data[kelompok_id].nama;
									var cek = false;
									kelompok.data.map(function(b, i){
										if(b.uraian == nama_kelompok){
											cek = true;
										}
										if(no_urut_kelompok < b.kdurut){
											no_urut_kelompok = b.kdurut;
										}
									});
									if(cek == false){
										no_urut_kelompok++;
										data_all.push({
											url: config.fmis_url+'/parameter/ssh/struktur-ssh/kelompok/save/'+data_ssh[_gol_id].code,
								            type: "post",
								            data: {
								                _token: _token,
								                kdurut: no_urut_kelompok,
								                uraian: nama_kelompok
								            }
										});
									}
								}
								resolve();
							}
						});
					}));
				}
			}
			Promise.all(sendData)
        	.then(function(val_all){
				// console.log('data_all kelompok', data_all);
				var last = data_all.length;
				data_all.reduce(function(sequence, nextData){
	                return sequence.then(function(current_data){
	            		return new Promise(function(resolve_redurce, reject_redurce){
		                	current_data.success = function(data){
								return resolve_redurce(nextData);
							};
							current_data.error = function(e) {
								console.log(e);
								return resolve_redurce(nextData);
							};
		                	relayAjax(current_data);
		                })
	                    .catch(function(e){
	                        console.log(e);
	                        return Promise.resolve(nextData);
	                    });
	                })
	                .catch(function(e){
	                    console.log(e);
	                    return Promise.resolve(nextData);
	                });
	            }, Promise.resolve(data_all[last]))
	            .then(function(data_last){
					jQuery('#wrap-loading').hide();
					alert('Berhasil singkron SSH dari SIPD!');
	            })
	            .catch(function(e){
	                console.log(e);
	            });
            })
            .catch(function(err){
                console.log('err', err);
        		alert('Ada kesalahan sistem!');
        		jQuery('#wrap-loading').hide();
            });
		}
	})
}

function intervalSession(no){
	if(!_token){
		return;
	}else{
		if(!no){
			no = 0;
		}
		relayAjax({
			url: config.fmis_url + '/dashboard',
			success: function(html){
				no++;
				console.log('Interval session per 60s ke '+no);
				setTimeout(function(){
					intervalSession(no);
				}, 60000);
			}
		});
	}
}